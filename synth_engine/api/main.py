from __future__ import annotations

from contextlib import asynccontextmanager
import json
import traceback
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from jose import JWTError

from synth_engine.storage.db import engine
from synth_engine.storage.models import Base, User, Profile, Constellation
from synth_engine.storage import repo as R

from synth_engine.api.auth import hash_password, verify_password, create_token
from synth_engine.api.deps import db, me_user_id

from synth_engine.schemas.person import PersonInput
from synth_engine.parsing.natal_text import parse_natal_text
from synth_engine.utils.timeutils import localize_birth
from synth_engine.utils.hashing import sha256_inputs

from synth_engine.compute.astrology import compute_natal
from synth_engine.compute.astrology_timing import compute_transits, detect_transit_events, state_priors_from_transits, compute_timing_window
from synth_engine.compute.numerology import numerology_compute
from synth_engine.compute.iching import iching_consult

from synth_engine.fusion.fusion_engine import build_state_from_sources
from synth_engine.fusion.jung import jung_overlay, jung_constellation_summary
from synth_engine.fusion.curriculum import bowen_curriculum

from synth_engine.graph.constellation import build_graph, annotate_edges
from synth_engine.graph.bowen import compute_bowen

from synth_engine.clinical.ingest import normalize_big5, normalize_attachment
from synth_engine.telemetry.adapter import infer_context
from synth_engine.api.ratelimit import TokenBucketLimiter
from synth_engine.api.auth import decode_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        raise RuntimeError("Database tables missing. Run: alembic upgrade head")
    yield


app = FastAPI(title="Synthesis Engine API", version="0.4.0", lifespan=lifespan)
limiter = TokenBucketLimiter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://defrag.app",
        "https://www.defrag.app",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=False,
    allow_methods=["*"] ,
    allow_headers=["*"],
)


def new_id() -> str:
    return str(uuid.uuid4())


@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}


@app.get("/debug/db")
def debug_db():
    from synth_engine.config import settings
    url = settings.database_url
    # Mask password if present
    masked = url
    if "@" in url:
        pre, rest = url.split("@", 1)
        if ":" in pre:
            scheme_user, _ = pre.rsplit(":", 1)
            masked = f"{scheme_user}:***@{rest}"
    return {"database_url": masked, "engine_url": str(engine.url)}


def require_profile(s: Session, user_id: str, profile_id: str) -> Profile:
    prof = s.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user_id).first()
    if not prof:
        raise HTTPException(404, "Profile not found")
    return prof


def get_person(s: Session, profile_id: str) -> PersonInput:
    prof = s.query(Profile).filter(Profile.id == profile_id).first()
    if not prof:
        raise HTTPException(404, "Profile not found")
    return PersonInput.model_validate_json(prof.person_json)


def limiter_key(auth_header: str) -> str:
    if not auth_header.startswith("Bearer "):
        return "anon"
    token = auth_header.split(" ", 1)[1]
    try:
        user_id = decode_token(token)
        return f"user:{user_id}"
    except JWTError:
        return f"token:{token[:16]}"
    except Exception:
        return f"token:{token[:16]}"


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return await call_next(request)
    route_path = request.url.path

    group = "default"
    if route_path.endswith("/compute_reading") or ("/constellations/" in route_path and route_path.endswith("/compute")):
        group = "compute"
    elif "/telemetry" in route_path:
        group = "telemetry"

    policy = {
        "default": (120, 2.0),
        "telemetry": (300, 5.0),
        "compute": (10, 0.1),
    }
    cap, refill = policy[group]

    key = (limiter_key(auth_header), group)

    if not limiter.allow(key, capacity=cap, refill_per_sec=refill, cost=1.0):
        return JSONResponse(status_code=429, content={"error": "rate_limited", "group": group})

    return await call_next(request)


# -------------------------
# Auth
# -------------------------
@app.post("/auth/register")
def register(email: str, password: str, s: Session = Depends(db)):
    uid = new_id()
    try:
        if s.query(User).filter(User.email == email).first():
            raise HTTPException(400, "Email already registered")
        pw_hash = hash_password(password)
        user = User(id=uid, email=email, password_hash=pw_hash)
        s.add(user)
        s.commit()
        return {"token": create_token(uid)}
    except HTTPException:
        raise
    except Exception as e:
        s.rollback()
        err_msg = f"{type(e).__name__}: {e}"
        print("ERROR /auth/register", err_msg, flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=err_msg)


@app.post("/auth/login")
def login(email: str, password: str, s: Session = Depends(db)):
    u = s.query(User).filter(User.email == email).first()
    if not u or not verify_password(password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_token(u.id)}


# -------------------------
# Profiles
# -------------------------
@app.post("/profiles/from_natal_text")
def create_profile_from_text(
    name: str,
    natal_text: str,
    viewing_timezone: str = "UTC",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    p = parse_natal_text(natal_text)
    person = PersonInput(
        person_id=new_id(),
        timezone=viewing_timezone,
        birth={
            "date": p.date,
            "time": p.time,
            "time_precision": p.time_precision,
            "location": {"lat": p.lat, "lon": p.lon},
            "birth_timezone": p.birth_timezone,
        },
        clinical={},
        preferences={},
        user_report=None,
    )
    pid = new_id()
    s.add(Profile(id=pid, user_id=user_id, name=name, person_json=person.model_dump_json()))
    s.commit()
    R.get_or_create_state_model(s, pid)
    return {"profile_id": pid, "person": person.model_dump()}


# -------------------------
# Clinical ingest
# -------------------------
@app.post("/profiles/{profile_id}/clinical/big5")
def set_big5(
    profile_id: str,
    O: float,
    C: float,
    E: float,
    A: float,
    N: float,
    timestamp: str,
    source: str = "user",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    prof = require_profile(s, user_id, profile_id)
    person = PersonInput.model_validate_json(prof.person_json)
    big5 = normalize_big5({"O": O, "C": C, "E": E, "A": A, "N": N, "timestamp": timestamp})
    R.save_clinical_record(s, profile_id, {"big5": big5}, source=source, ts_iso=timestamp)
    person.clinical.big5 = big5
    R.update_profile_person_json(s, profile_id, person.model_dump_json())
    return {"ok": True, "big5": big5}


@app.post("/profiles/{profile_id}/clinical/attachment")
def set_attachment(
    profile_id: str,
    anxiety: float,
    avoidance: float,
    timestamp: str,
    source: str = "user",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    prof = require_profile(s, user_id, profile_id)
    person = PersonInput.model_validate_json(prof.person_json)
    att = normalize_attachment({"anxiety": anxiety, "avoidance": avoidance, "timestamp": timestamp})
    R.save_clinical_record(s, profile_id, {"attachment": att}, source=source, ts_iso=timestamp)
    person.clinical.attachment = att
    R.update_profile_person_json(s, profile_id, person.model_dump_json())
    return {"ok": True, "attachment": att}


# -------------------------
# Check-ins
# -------------------------
@app.post("/profiles/{profile_id}/checkins")
def create_checkin(
    profile_id: str,
    stress: int,
    mood: int = -1,
    energy: int = -1,
    sleep_quality: int = -1,
    notes: str = "",
    source: str = "user",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    now = datetime.now(timezone.utc).isoformat()

    def ok(v: int) -> bool:
        return (v == -1) or (0 <= v <= 100)

    if not ok(stress) or not ok(mood) or not ok(energy) or not ok(sleep_quality):
        raise HTTPException(400, "Values must be 0..100 or -1.")
    ci = R.save_checkin(s, profile_id, now, stress, mood, energy, sleep_quality, notes, source)
    return {"checkin_id": ci.id, "ts": ci.ts}


@app.get("/profiles/{profile_id}/checkins")
def list_checkins(
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    try:
        rows, next_ts, next_id = R.list_checkins_keyset(
            s, profile_id=profile_id, limit=limit, before_ts=before_ts, before_id=before_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {
                "id": r.id,
                "ts": r.ts,
                "stress": r.stress,
                "mood": r.mood,
                "energy": r.energy,
                "sleep_quality": r.sleep_quality,
                "notes": r.notes,
                "source": r.source,
                "created_at": r.created_at.astimezone(timezone.utc).isoformat(),
            }
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


# -------------------------
# Telemetry
# -------------------------
@app.post("/profiles/{profile_id}/telemetry")
def post_telemetry(
    profile_id: str,
    page: str = "",
    dwell_ms: int = 0,
    clicks: int = 0,
    scroll_depth: int = 0,
    payload_json: str = "{}",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    now = datetime.now(timezone.utc).isoformat()

    try:
        extra = json.loads(payload_json) if payload_json else {}
    except Exception:
        extra = {}

    context = infer_context(page, dwell_ms, clicks, scroll_depth, extra)
    row = R.save_telemetry_event(s, profile_id, page, dwell_ms, clicks, scroll_depth, extra, context, ts_iso=now)
    return {"telemetry_id": row.id, "context_inferred": context}


@app.get("/profiles/{profile_id}/telemetry")
def list_telemetry(
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    try:
        rows, next_ts, next_id = R.list_telemetry_keyset(
            s, profile_id=profile_id, limit=limit, before_ts=before_ts, before_id=before_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {
                "id": r.id,
                "ts": r.ts,
                "page": r.page,
                "dwell_ms": r.dwell_ms,
                "clicks": r.clicks,
                "scroll_depth": r.scroll_depth,
                "payload": json.loads(r.payload_json) if r.payload_json else {},
                "context": json.loads(r.context_json) if r.context_json else {},
                "created_at": r.created_at.astimezone(timezone.utc).isoformat(),
            }
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


# -------------------------
# Jung journaling (symbolic)
# -------------------------
@app.post("/profiles/{profile_id}/jung/journal")
def jung_from_journal(
    profile_id: str,
    journal_text: str,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    latent = R.latest_layer_payload(s, profile_id, "latent") or {"state": {}, "traits": {}}
    out = jung_overlay(journal_text=journal_text, latent=latent)

    as_of_iso = datetime.now(timezone.utc).isoformat()
    reading = R.create_reading_run(s, profile_id, as_of_iso)
    R.save_layer(
        s,
        profile_id,
        reading.id,
        "jung",
        as_of_iso,
        out,
        sha256_inputs({"journal": journal_text, "latent": latent}),
        "1.0.0",
    )
    return {"reading_id": reading.id, "jung": out}


# -------------------------
# Internal helper: compute reading for a profile (used by constellation auto-compute)
# -------------------------
def compute_profile_reading(s: Session, profile_id: str, days: int = 14, include_symbolic: bool = False) -> Dict[str, Any]:
    person = get_person(s, profile_id)

    if person.birth.time:
        birth_utc = localize_birth(person.birth.date, person.birth.time, person.birth.birth_timezone)
    else:
        birth_utc = localize_birth(person.birth.date, "12:00:00", person.birth.birth_timezone)

    lat = person.birth.location.lat
    lon = person.birth.location.lon
    now = datetime.now(timezone.utc)
    as_of_iso = now.isoformat()
    reading = R.create_reading_run(s, profile_id, as_of_iso)

    natal = compute_natal(birth_utc, lat, lon)
    R.save_layer(s, profile_id, reading.id, "natal_astro", as_of_iso, natal, natal["inputs_hash"], "1.0.0")

    trans = compute_transits(now, lat, lon)
    events = (detect_transit_events(natal, trans, 1.5, "tight") + detect_transit_events(natal, trans, 3.0, "medium"))[
        :50
    ]
    priors = state_priors_from_transits(events)
    window = compute_timing_window(natal, lat, lon, now, days=days)
    timing_payload = {"as_of": as_of_iso, "priors": priors, "events": events, "window": window}
    R.save_layer(s, profile_id, reading.id, "timing", as_of_iso, timing_payload, sha256_inputs(timing_payload), "1.0.0")

    ci = R.latest_checkin(s, profile_id, within_hours=12)
    checkin_dict = None
    if ci:
        checkin_dict = {
            "ts": ci.ts,
            "stress": ci.stress,
            "mood": ci.mood,
            "energy": ci.energy,
            "sleep_quality": ci.sleep_quality,
            "notes": ci.notes,
            "source": ci.source,
        }
        R.save_layer(s, profile_id, reading.id, "checkin_latest", as_of_iso, checkin_dict, sha256_inputs(checkin_dict), "1.0.0")

    context_inferred = R.latest_context_inferred(s, profile_id, within_hours=2)
    sm = R.get_or_create_state_model(s, profile_id)
    sm_dict = {
        "w_user": sm.w_user,
        "w_timing": sm.w_timing,
        "w_context": sm.w_context,
        "stress_bias": sm.stress_bias,
        "stress_scale": sm.stress_scale,
    }

    state_out = build_state_from_sources(
        checkin=checkin_dict,
        context_inferred=context_inferred,
        timing_priors=priors if person.preferences.astrology_timing_enabled else None,
        state_model=sm_dict,
    )

    latent = {
        "as_of": as_of_iso,
        "traits": person.clinical.big5.model_dump() if person.clinical.big5 else None,
        "attachment": person.clinical.attachment.model_dump() if person.clinical.attachment else None,
        "state": state_out["vector"],
        "state_uncertainty": state_out["uncertainty"],
        "drivers": {"state": state_out["drivers"], "context_inferred": context_inferred},
        "confidence": state_out["confidence"],
        "calibration_questions": state_out["calibration_questions"],
        "time_precision": person.birth.time_precision,
        "birth_utc": birth_utc.isoformat(),
    }
    R.save_layer(s, profile_id, reading.id, "latent", as_of_iso, latent, sha256_inputs(latent), "1.0.0")

    if include_symbolic and person.preferences.symbolic_overlay:
        symbolic = {"numerology": numerology_compute(person.birth.date, person.name_at_birth)}
        if person.preferences.iching_consult_enabled:
            symbolic["iching"] = iching_consult(question="(session)", method="coins", primary_hex=1, changing_lines=[])
        R.save_layer(s, profile_id, reading.id, "symbolic", as_of_iso, symbolic, sha256_inputs(symbolic), "1.0.0")

    return {"reading_id": reading.id, "latent": latent}


# -------------------------
# Compute reading (public)
# -------------------------
@app.post("/profiles/{profile_id}/compute_reading")
def compute_reading(
    profile_id: str,
    days: int = 14,
    include_symbolic: bool = True,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    out = compute_profile_reading(s, profile_id, days=days, include_symbolic=include_symbolic)
    return out


@app.get("/profiles/{profile_id}/readings")
def list_readings(
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    try:
        rows, next_ts, next_id = R.list_readings_keyset(
            s, profile_id=profile_id, limit=limit, before_ts=before_ts, before_id=before_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {"id": r.id, "as_of": r.as_of, "created_at": r.created_at.astimezone(timezone.utc).isoformat()}
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


@app.get("/profiles/{profile_id}/layers")
def list_layers(
    profile_id: str,
    layer: Optional[str] = None,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    try:
        rows, next_ts, next_id = R.list_layers_keyset(
            s, profile_id=profile_id, layer=layer, limit=limit, before_ts=before_ts, before_id=before_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {
                "id": r.id,
                "reading_id": r.reading_id,
                "layer": r.layer,
                "as_of": r.as_of,
                "inputs_hash": r.inputs_hash,
                "version": r.version,
                "created_at": r.created_at.astimezone(timezone.utc).isoformat(),
            }
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


@app.get("/profiles/{profile_id}/clinical/records")
def list_clinical_records(
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    _ = require_profile(s, user_id, profile_id)
    try:
        rows, next_ts, next_id = R.list_clinical_records_keyset(
            s, profile_id=profile_id, limit=limit, before_ts=before_ts, before_id=before_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {
                "id": r.id,
                "ts": r.ts,
                "payload": json.loads(r.payload_json) if r.payload_json else {},
                "source": r.source,
                "created_at": r.created_at.astimezone(timezone.utc).isoformat(),
            }
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


# -------------------------
# Constellations
# -------------------------
@app.post("/constellations/create")
def create_constellation(name: str, user_id: str = Depends(me_user_id), s: Session = Depends(db)):
    c = R.create_constellation(s, user_id, name)
    return {"constellation_id": c.id, "name": c.name}


@app.post("/constellations/{constellation_id}/members/add")
def add_member(
    constellation_id: str,
    profile_id: str,
    role: str = "member",
    meta_json: str = "{}",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    c = R.get_constellation_owned(s, constellation_id, user_id)
    if not c:
        raise HTTPException(404, "Constellation not found")
    try:
        meta = json.loads(meta_json) if meta_json else {}
    except Exception:
        meta = {}
    row = R.add_member(s, constellation_id, profile_id, role=role, meta=meta)
    return {"member_id": row.id}


@app.post("/constellations/{constellation_id}/edges/add")
def add_edge(
    constellation_id: str,
    from_profile_id: str,
    to_profile_id: str,
    relationship: str = "related",
    meta_json: str = "{}",
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    c = R.get_constellation_owned(s, constellation_id, user_id)
    if not c:
        raise HTTPException(404, "Constellation not found")
    try:
        meta = json.loads(meta_json) if meta_json else {}
    except Exception:
        meta = {}
    row = R.add_edge(s, constellation_id, from_profile_id, to_profile_id, relationship=relationship, meta=meta)
    return {"edge_id": row.id}


@app.post("/constellations/{constellation_id}/compute")
def compute_constellation(
    constellation_id: str,
    auto_compute_missing: bool = True,
    days_for_autocompute: int = 14,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    c = R.get_constellation_owned(s, constellation_id, user_id)
    if not c:
        raise HTTPException(404, "Constellation not found")

    members = R.list_members(s, constellation_id)
    edges_db = R.list_edges(s, constellation_id)

    if not members:
        raise HTTPException(400, "Constellation has no members. Add members first.")
    if not edges_db:
        raise HTTPException(400, "Constellation has no edges. Add edges first.")

    member_ids = [m.profile_id for m in members]

    missing = []
    for pid in member_ids:
        latent = R.latest_layer_payload(s, pid, "latent")
        if not latent:
            missing.append(pid)

    if missing and auto_compute_missing:
        for pid in missing:
            compute_profile_reading(s, pid, days=days_for_autocompute, include_symbolic=False)
        missing2 = [pid for pid in member_ids if not R.latest_layer_payload(s, pid, "latent")]
        if missing2:
            raise HTTPException(400, f"Still missing latent after autocompute: {missing2}")
    elif missing and not auto_compute_missing:
        raise HTTPException(
            400,
            f"Missing latent for profiles: {missing}. Compute readings first or enable auto_compute_missing.",
        )

    nodes: list[dict[str, Any]] = []
    for pid in member_ids:
        latent = R.latest_layer_payload(s, pid, "latent") or {}
        nodes.append(
            {
                "person_id": pid,
                "role": next((m.role for m in members if m.profile_id == pid), "member"),
                "latent": {"traits": latent.get("traits"), "state": latent.get("state")},
            }
        )

    edges: list[dict[str, Any]] = []
    for e in edges_db:
        edges.append(
            {
                "from": e.from_profile_id,
                "to": e.to_profile_id,
                "relationship": e.relationship,
                "meta": json.loads(e.meta_json) if e.meta_json else {},
            }
        )

    G = build_graph(nodes, edges)
    annotate_edges(G)
    bowen = compute_bowen(G)

    computed_edges = []
    for u, v in G.edges:
        computed_edges.append(
            {
                "from": u,
                "to": v,
                "relationship": G.edges[u, v].get("relationship", "related"),
                "conflict_risk": float(G.edges[u, v].get("conflict_risk", 0.0)),
                "meta": G.edges[u, v].get("meta", {}),
            }
        )

    as_of_iso = datetime.now(timezone.utc).isoformat()
    constellation_view = {
        "constellation_id": constellation_id,
        "as_of": as_of_iso,
        "nodes": [{"profile_id": n["person_id"], "role": n.get("role", "member")} for n in nodes],
        "edges": computed_edges,
    }

    curriculum = bowen_curriculum(constellation_view, bowen)
    jung_sum = jung_constellation_summary(constellation=constellation_view, bowen=bowen)

    run = R.create_constellation_run(s, constellation_id, as_of_iso)
    inputs_hash = sha256_inputs({"members": sorted(member_ids), "edges": computed_edges})

    R.save_constellation_layer(s, constellation_id, run.id, "constellation", as_of_iso, constellation_view, inputs_hash, "1.0.0")
    R.save_constellation_layer(s, constellation_id, run.id, "bowen", as_of_iso, bowen, sha256_inputs(bowen), "1.0.0")
    R.save_constellation_layer(s, constellation_id, run.id, "curriculum", as_of_iso, curriculum, sha256_inputs(curriculum), "1.0.0")
    R.save_constellation_layer(s, constellation_id, run.id, "jung_summary", as_of_iso, jung_sum, sha256_inputs(jung_sum), "1.0.0")

    return {
        "run_id": run.id,
        "constellation": constellation_view,
        "bowen": bowen,
        "curriculum": curriculum,
        "jung_summary": jung_sum,
    }


@app.get("/constellations/{constellation_id}/runs")
def list_constellation_runs(
    constellation_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    c = R.get_constellation_owned(s, constellation_id, user_id)
    if not c:
        raise HTTPException(404, "Constellation not found")
    try:
        rows, next_ts, next_id = R.list_constellation_runs_keyset(
            s, constellation_id=constellation_id, limit=limit, before_ts=before_ts, before_id=before_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {"id": r.id, "as_of": r.as_of, "created_at": r.created_at.astimezone(timezone.utc).isoformat()}
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


@app.get("/constellations/{constellation_id}/layers")
def list_constellation_layers(
    constellation_id: str,
    run_id: Optional[str] = None,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    c = R.get_constellation_owned(s, constellation_id, user_id)
    if not c:
        raise HTTPException(404, "Constellation not found")
    try:
        rows, next_ts, next_id = R.list_constellation_layers_keyset(
            s,
            constellation_id=constellation_id,
            run_id=run_id,
            limit=limit,
            before_ts=before_ts,
            before_id=before_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "items": [
            {
                "id": r.id,
                "run_id": r.run_id,
                "layer": r.layer,
                "as_of": r.as_of,
                "inputs_hash": r.inputs_hash,
                "version": r.version,
                "created_at": r.created_at.astimezone(timezone.utc).isoformat(),
            }
            for r in rows
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }

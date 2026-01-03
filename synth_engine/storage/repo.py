from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Dict, List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_

from synth_engine.storage.models import (
    Profile,
    Reading,
    ComputedLayer,
    CheckIn,
    StateModel,
    ClinicalRecord,
    TelemetryEvent,
    Constellation,
    ConstellationMember,
    ConstellationEdge,
    ConstellationRun,
    ConstellationLayer,
)


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# -------------------------
# State model
# -------------------------
def get_or_create_state_model(s: Session, profile_id: str) -> StateModel:
    sm = s.query(StateModel).filter(StateModel.profile_id == profile_id).first()
    if sm:
        return sm
    sm = StateModel(id=new_id(), profile_id=profile_id)
    s.add(sm)
    s.commit()
    return sm


# -------------------------
# Pagination helpers
# -------------------------
def _clamp_limit(limit: int, default: int = 50, max_limit: int = 200) -> int:
    try:
        l = int(limit)
    except Exception:
        l = default
    return max(1, min(max_limit, l))


def parse_before_ts(before_ts: Optional[str]) -> Optional[datetime]:
    if before_ts is None:
        return None
    ts = before_ts.strip()
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        raise ValueError("before_ts must include timezone.")
    # Store naive UTC for SQLite comparisons
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def parse_keyset(before_ts: Optional[str], before_id: Optional[str]) -> Tuple[Optional[datetime], Optional[str]]:
    if before_ts is None and before_id is None:
        return None, None
    if not before_ts or not before_id:
        raise ValueError("before_ts and before_id must both be provided.")
    return parse_before_ts(before_ts), str(before_id)


def to_utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat()


# -------------------------
# Check-ins
# -------------------------
def save_checkin(
    s: Session,
    profile_id: str,
    ts_iso: str,
    stress: int,
    mood: int = -1,
    energy: int = -1,
    sleep_quality: int = -1,
    notes: str = "",
    source: str = "user",
) -> CheckIn:
    ci = CheckIn(
        id=new_id(),
        profile_id=profile_id,
        ts=ts_iso,
        stress=int(stress),
        mood=int(mood),
        energy=int(energy),
        sleep_quality=int(sleep_quality),
        notes=notes or "",
        source=source,
    )
    s.add(ci)
    s.commit()
    return ci


def latest_checkin(s: Session, profile_id: str, within_hours: int = 12) -> Optional[CheckIn]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=within_hours)
    rows = (
        s.query(CheckIn)
        .filter(CheckIn.profile_id == profile_id)
        .order_by(desc(CheckIn.created_at))
        .limit(30)
        .all()
    )
    for r in rows:
        try:
            ts = datetime.fromisoformat(r.ts.replace("Z", "+00:00")).astimezone(timezone.utc)
        except Exception:
            continue
        if ts >= cutoff:
            return r
    return None


def list_checkins_keyset(
    s: Session,
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[CheckIn], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)

    q = (
        s.query(CheckIn)
        .filter(CheckIn.profile_id == profile_id)
        .order_by(desc(CheckIn.created_at), desc(CheckIn.id))
    )
    if bts is not None and bid is not None:
        q = q.filter(or_(CheckIn.created_at < bts, and_(CheckIn.created_at == bts, CheckIn.id < bid)))

    rows = q.limit(limit).all()

    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


# -------------------------
# Readings and per-profile layers
# -------------------------
def create_reading_run(s: Session, profile_id: str, as_of_iso: str) -> Reading:
    r = Reading(id=new_id(), profile_id=profile_id, as_of=as_of_iso)
    s.add(r)
    s.commit()
    return r


def save_layer(
    s: Session,
    profile_id: str,
    reading_id: str,
    layer: str,
    as_of_iso: str,
    payload: Dict[str, Any],
    inputs_hash: str,
    version: str = "1.0.0",
) -> ComputedLayer:
    row = ComputedLayer(
        id=new_id(),
        profile_id=profile_id,
        reading_id=reading_id,
        layer=layer,
        as_of=as_of_iso,
        payload_json=json.dumps(payload),
        inputs_hash=inputs_hash,
        version=version,
    )
    s.add(row)
    s.commit()
    return row


def latest_layer_payload(s: Session, profile_id: str, layer: str) -> Optional[Dict[str, Any]]:
    row = (
        s.query(ComputedLayer)
        .filter(ComputedLayer.profile_id == profile_id, ComputedLayer.layer == layer)
        .order_by(desc(ComputedLayer.created_at))
        .first()
    )
    if not row:
        return None
    try:
        return json.loads(row.payload_json)
    except Exception:
        return None


def list_readings_keyset(
    s: Session,
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[Reading], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)
    q = (
        s.query(Reading)
        .filter(Reading.profile_id == profile_id)
        .order_by(desc(Reading.created_at), desc(Reading.id))
    )
    if bts is not None and bid is not None:
        q = q.filter(or_(Reading.created_at < bts, and_(Reading.created_at == bts, Reading.id < bid)))
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


def list_layers_keyset(
    s: Session,
    profile_id: str,
    layer: Optional[str] = None,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[ComputedLayer], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)
    q = s.query(ComputedLayer).filter(ComputedLayer.profile_id == profile_id)
    if layer:
        q = q.filter(ComputedLayer.layer == layer)
    q = q.order_by(desc(ComputedLayer.created_at), desc(ComputedLayer.id))
    if bts is not None and bid is not None:
        q = q.filter(
            or_(
                ComputedLayer.created_at < bts,
                and_(ComputedLayer.created_at == bts, ComputedLayer.id < bid),
            )
        )
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


# -------------------------
# Clinical ingest persistence
# -------------------------
def save_clinical_record(
    s: Session,
    profile_id: str,
    payload: Dict[str, Any],
    source: str = "user",
    ts_iso: Optional[str] = None,
) -> ClinicalRecord:
    ts_iso = ts_iso or now_iso()
    rec = ClinicalRecord(id=new_id(), profile_id=profile_id, ts=ts_iso, payload_json=json.dumps(payload), source=source)
    s.add(rec)
    s.commit()
    return rec


def update_profile_person_json(s: Session, profile_id: str, new_person_json: str) -> None:
    prof = s.query(Profile).filter(Profile.id == profile_id).first()
    if not prof:
        raise ValueError("profile not found")
    prof.person_json = new_person_json
    s.commit()


def list_clinical_records_keyset(
    s: Session,
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[ClinicalRecord], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)
    q = (
        s.query(ClinicalRecord)
        .filter(ClinicalRecord.profile_id == profile_id)
        .order_by(desc(ClinicalRecord.created_at), desc(ClinicalRecord.id))
    )
    if bts is not None and bid is not None:
        q = q.filter(
            or_(ClinicalRecord.created_at < bts, and_(ClinicalRecord.created_at == bts, ClinicalRecord.id < bid))
        )
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


# -------------------------
# Telemetry + context inference
# -------------------------
def save_telemetry_event(
    s: Session,
    profile_id: str,
    page: str,
    dwell_ms: int,
    clicks: int,
    scroll_depth: int,
    payload: Dict[str, Any],
    context: Dict[str, Any],
    ts_iso: Optional[str] = None,
) -> TelemetryEvent:
    ts_iso = ts_iso or now_iso()
    row = TelemetryEvent(
        id=new_id(),
        profile_id=profile_id,
        ts=ts_iso,
        page=page or "",
        dwell_ms=int(dwell_ms),
        clicks=int(clicks),
        scroll_depth=int(scroll_depth),
        payload_json=json.dumps(payload or {}),
        context_json=json.dumps(context or {}),
    )
    s.add(row)
    s.commit()
    return row


def latest_context_inferred(s: Session, profile_id: str, within_hours: int = 2) -> Optional[Dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=within_hours)
    rows = (
        s.query(TelemetryEvent)
        .filter(TelemetryEvent.profile_id == profile_id)
        .order_by(desc(TelemetryEvent.created_at))
        .limit(30)
        .all()
    )
    for r in rows:
        try:
            ts = datetime.fromisoformat(r.ts.replace("Z", "+00:00")).astimezone(timezone.utc)
        except Exception:
            continue
        if ts >= cutoff:
            try:
                return json.loads(r.context_json)
            except Exception:
                return None
    return None


# -------------------------
# Telemetry listing
# -------------------------
def list_telemetry_keyset(
    s: Session,
    profile_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[TelemetryEvent], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit, default=50, max_limit=200)
    bts, bid = parse_keyset(before_ts, before_id)
    q = (
        s.query(TelemetryEvent)
        .filter(TelemetryEvent.profile_id == profile_id)
        .order_by(desc(TelemetryEvent.created_at), desc(TelemetryEvent.id))
    )
    if bts is not None and bid is not None:
        q = q.filter(
            or_(TelemetryEvent.created_at < bts, and_(TelemetryEvent.created_at == bts, TelemetryEvent.id < bid))
        )
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


# -------------------------
# Constellations
# -------------------------
def get_constellation_owned(s: Session, constellation_id: str, user_id: str) -> Optional[Constellation]:
    return s.query(Constellation).filter(Constellation.id == constellation_id, Constellation.user_id == user_id).first()


def create_constellation(s: Session, user_id: str, name: str) -> Constellation:
    c = Constellation(id=new_id(), user_id=user_id, name=name)
    s.add(c)
    s.commit()
    return c


def add_member(
    s: Session,
    constellation_id: str,
    profile_id: str,
    role: str = "member",
    meta: Optional[Dict[str, Any]] = None,
) -> ConstellationMember:
    row = ConstellationMember(
        id=new_id(),
        constellation_id=constellation_id,
        profile_id=profile_id,
        role=role,
        meta_json=json.dumps(meta or {}),
    )
    s.add(row)
    s.commit()
    return row


def list_members(s: Session, constellation_id: str) -> List[ConstellationMember]:
    return (
        s.query(ConstellationMember)
        .filter(ConstellationMember.constellation_id == constellation_id)
        .order_by(ConstellationMember.created_at.asc())
        .all()
    )


def add_edge(
    s: Session,
    constellation_id: str,
    from_profile_id: str,
    to_profile_id: str,
    relationship: str = "related",
    meta: Optional[Dict[str, Any]] = None,
) -> ConstellationEdge:
    row = ConstellationEdge(
        id=new_id(),
        constellation_id=constellation_id,
        from_profile_id=from_profile_id,
        to_profile_id=to_profile_id,
        relationship=relationship,
        meta_json=json.dumps(meta or {}),
    )
    s.add(row)
    s.commit()
    return row


def list_edges(s: Session, constellation_id: str) -> List[ConstellationEdge]:
    return (
        s.query(ConstellationEdge)
        .filter(ConstellationEdge.constellation_id == constellation_id)
        .order_by(ConstellationEdge.created_at.asc())
        .all()
    )


def list_constellation_runs_keyset(
    s: Session,
    constellation_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[ConstellationRun], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)
    q = (
        s.query(ConstellationRun)
        .filter(ConstellationRun.constellation_id == constellation_id)
        .order_by(desc(ConstellationRun.created_at), desc(ConstellationRun.id))
    )
    if bts is not None and bid is not None:
        q = q.filter(
            or_(ConstellationRun.created_at < bts, and_(ConstellationRun.created_at == bts, ConstellationRun.id < bid))
        )
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


def create_constellation_run(s: Session, constellation_id: str, as_of_iso: str) -> ConstellationRun:
    r = ConstellationRun(id=new_id(), constellation_id=constellation_id, as_of=as_of_iso)
    s.add(r)
    s.commit()
    return r


def save_constellation_layer(
    s: Session,
    constellation_id: str,
    run_id: str,
    layer: str,
    as_of_iso: str,
    payload: Dict[str, Any],
    inputs_hash: str,
    version: str = "1.0.0",
) -> ConstellationLayer:
    row = ConstellationLayer(
        id=new_id(),
        constellation_id=constellation_id,
        run_id=run_id,
        layer=layer,
        as_of=as_of_iso,
        payload_json=json.dumps(payload),
        inputs_hash=inputs_hash,
        version=version,
    )
    s.add(row)
    s.commit()
    return row


def list_constellation_layers_keyset(
    s: Session,
    constellation_id: str,
    run_id: Optional[str] = None,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[ConstellationLayer], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)
    q = s.query(ConstellationLayer).filter(ConstellationLayer.constellation_id == constellation_id)
    if run_id:
        q = q.filter(ConstellationLayer.run_id == run_id)
    q = q.order_by(desc(ConstellationLayer.created_at), desc(ConstellationLayer.id))
    if bts is not None and bid is not None:
        q = q.filter(
            or_(
                ConstellationLayer.created_at < bts,
                and_(ConstellationLayer.created_at == bts, ConstellationLayer.id < bid),
            )
        )
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = last.created_at.astimezone(timezone.utc).isoformat()
        next_id = last.id
    return rows, next_ts, next_id

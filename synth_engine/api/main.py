from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import json
import base64
import hashlib
import hmac
import traceback
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, Depends, HTTPException, Request, Body, Query, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from jose import JWTError
from pydantic import BaseModel, ValidationError

from synth_engine.storage.db import engine
from synth_engine.storage.models import Base, User, Profile, Constellation
from synth_engine.storage import repo as R

from synth_engine.api.auth import hash_password, verify_password, create_token, create_agent_token
from synth_engine.api.deps import db, me_user_id, get_current_user
from synth_engine.api.oauth import verify_google_id_token, verify_apple_id_token
from synth_engine.config import settings

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
from synth_engine.api.entitlements import require_entitlement, require_plan
from synth_engine.fusion.synthesis import synthesize_profile, synthesize_constellation
from synth_engine.agency.pass_levels import PassLevel
from synth_engine.agency.guardrails import allowed_action_names
from synth_engine.core.spiral_store import append_spiral_event
from synth_engine.core.spiral_query import query_spiral, KNOWN_EVENT_KINDS
from synth_engine.api.abuse import (
    RequestIDMiddleware, 
    AbuseControlMiddleware,
    get_abuse_metrics,
)
from synth_engine.utils.diag import secret_fingerprint

# Import routers
from synth_engine.api.billing import router as billing_router
from synth_engine.api.admin import router as admin_router
from synth_engine.api.ai import router as ai_router
from synth_engine.api.wallet import router as wallet_router
from synth_engine.api.routes.agent_session import router as agent_session_router, _SESSIONS

diag_logger = logging.getLogger("synth_engine.diag")


@asynccontextmanager
async def lifespan(app: FastAPI):
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        raise RuntimeError("Database tables missing. Run: alembic upgrade head")
    fp = secret_fingerprint(settings.backend_hmac_secret)
    if fp:
        diag_logger.info("backend_hmac_secret_fingerprint=%s", fp)
    else:
        diag_logger.info("backend_hmac_secret_configured=false")
    print(f"backend_hmac_secret_fingerprint={fp} configured={bool(fp)}", flush=True)
    yield


app = FastAPI(title="Synthesis Engine API", version="0.7.1", lifespan=lifespan)
limiter = TokenBucketLimiter()

# Include routers
app.include_router(billing_router)
app.include_router(admin_router)
app.include_router(ai_router)
app.include_router(wallet_router)
app.include_router(agent_session_router)

# Add abuse control middleware (order matters: RequestID first, then AbuseControl)
# Note: Starlette middleware is added in reverse order (last added = first executed)
app.add_middleware(AbuseControlMiddleware)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://defrag.app",
        "https://www.defrag.app",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Enable XSS filter (legacy, but still useful)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Referrer policy - don't leak full URL to other origins
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Permissions policy - restrict sensitive APIs
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    
    return response


def new_id() -> str:
    return str(uuid.uuid4())


class ExecuteActionRequest(BaseModel):
    session_id: str
    action: str
    args: Dict[str, Any] = {}


@app.post("/agent/action/execute")
async def execute_action(req: ExecuteActionRequest):
    # Read pass_level from session context
    meta = _SESSIONS.get(req.session_id)
    pass_level = PassLevel(meta["pass_level"]) if meta and "pass_level" in meta else PassLevel.GUIDED
    user_id = meta["user_id"] if meta and "user_id" in meta else "unknown"

    allow = set(allowed_action_names(pass_level))
    if req.action not in allow:
        diag_logger.warning(
            "action_not_allowed session_id=%s action=%s pass_level=%s",
            req.session_id,
            req.action,
            pass_level,
        )
        return {"ok": False, "error": "action_not_allowed", "pass_level": str(pass_level)}

    # Log acceptance of a proposal (Spiral)
    try:
        append_spiral_event(user_id=user_id, event={
            "kind": "proposal_accepted",
            "session_id": req.session_id,
            "pass_level": str(pass_level),
            "action": req.action,
            "args": req.args or {},
        })
    except Exception:
        pass

    diag_logger.info(
        "execute_action session_id=%s action=%s args=%s pass_level=%s",
        req.session_id,
        req.action,
        req.args,
        pass_level,
    )

    # Implement minimal real executions (no side effects yet)
    if req.action == "open_module":
        # returns an instruction the UI can follow
        return {"ok": True, "type": "navigate", "route": req.args.get("route", "/")}

    if req.action == "log_event":
        # Persist to Spiral (building block #1 for agent recurrence)
        rec = append_spiral_event(user_id=user_id, event=req.args or {})
        return {"ok": True, "type": "logged", "record": rec}

    if req.action == "play_audio":
        return {"ok": True, "type": "audio", "ref": req.args}

    if req.action == "schedule_prompt":
        # MVP: persist schedule intent only (no external side effects)
        rec = append_spiral_event(user_id=user_id, event={
            "kind": "schedule_prompt",
            "session_id": req.session_id,
            "args": req.args or {},
        })
        return {"ok": True, "type": "scheduled", "record": rec}

    # Active-only actions remain "proposed but not executed" for now
    return {"ok": True, "type": "ack", "executed": {"action": req.action, "args": req.args}}


class DeclineActionRequest(BaseModel):
    session_id: str
    action: str
    args: Dict[str, Any] = {}
    reason: str = "user_declined"


@app.post("/agent/action/decline")
async def decline_action(req: DeclineActionRequest):
    meta = _SESSIONS.get(req.session_id)
    user_id = meta["user_id"] if meta and "user_id" in meta else "unknown"
    pass_level = PassLevel(meta["pass_level"]) if meta and "pass_level" in meta else PassLevel.GUIDED

    rec = append_spiral_event(user_id=user_id, event={
        "kind": "proposal_declined",
        "session_id": req.session_id,
        "pass_level": str(pass_level),
        "action": req.action,
        "args": req.args or {},
        "reason": req.reason,
    })
    return {"ok": True, "type": "declined", "record": rec}


@app.get("/spiral/events")
async def spiral_events(
    user_id: str = Query(...),
    kind: str = Query(None),
    limit: int = Query(50, ge=1, le=500),
    cursor: Optional[float] = Query(None, description="Unix timestamp cursor for pagination"),
    current_user=Depends(get_current_user),
):
    """Query Spiral events for a user. Used for agent recurrence and UI display."""
    # Auth safety: prevent cross-user leakage (compare as strings for UUID compat)
    if current_user and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's Spiral")
    
    # Validate kind if provided
    if kind and kind not in KNOWN_EVENT_KINDS:
        raise HTTPException(status_code=400, detail=f"Unknown event kind: {kind}")
    
    kinds = [kind] if kind else None
    events, next_cursor = query_spiral(user_id=user_id, kinds=kinds, limit=limit, cursor=cursor)
    return {
        "ok": True,
        "events": events,
        "count": len(events),
        "next_cursor": next_cursor,
    }


@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}


def _insight_level(stability: float) -> str:
    if stability < 0.25:
        return "grounded"
    if stability < 0.50:
        return "technical"
    if stability < 0.75:
        return "systems"
    return "expanded"


@app.get("/status/report")
def status_report(
    anxiety_index: float = Query(..., ge=0.0, le=1.0, description="0.0 (calm) to 1.0 (high strain)"),
    active_gate: int = Query(..., ge=1, le=64, description="Active pattern index (1-64)"),
    concept: Optional[str] = Query("stability", description="Label for the report concept"),
):
    """Sanitized, non-identifying status report.

    Returns derived fields only (no secrets, no user identifiers).
    Intended for UI widgets and demo-safe telemetry.
    """
    # Derived fields (do not expose internal coefficients/constants)
    dos_value = 1.0 - (anxiety_index * 0.85)
    vortex_sync = (active_gate % 3 == 0)
    coherence = 0.98 if vortex_sync else 0.42
    stability_score = float(dos_value * coherence)

    # Returned only as bounded scalar (rounded) for UI.
    metric_warp = float(-(1.0 - (0.05 * stability_score)))

    return {
        "concept": concept,
        "inputs": {
            "anxiety_index": round(float(anxiety_index), 3),
            "active_gate": int(active_gate),
        },
        "derived": {
            "dos_value": round(float(dos_value), 4),
            "vortex_sync": "LOCKED" if vortex_sync else "DRIFT",
            "stability_score": round(float(stability_score), 4),
            "metric_warp": round(float(metric_warp), 4),
            "insight_level": _insight_level(stability_score),
        },
        "safety": {
            "no_prediction": True,
            "no_user_identifiers": True,
            "notes": "Sanitized derived fields for UI + correlation. Not medical advice.",
        },
    }


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


@app.get("/dashboard")
def dashboard(user=Depends(get_current_user), s: Session = Depends(db)):
    """
    One-call endpoint to hydrate the frontend dashboard.
    Returns user info, billing status, profiles, and recent activity.
    """
    # Get billing status
    billing = R.get_billing_status(s, user.id)
    
    # Get profiles
    profiles = s.query(Profile).filter(Profile.user_id == user.id).order_by(Profile.created_at.desc()).limit(10).all()
    
    # Get constellations
    constellations = s.query(Constellation).filter(Constellation.user_id == user.id).order_by(Constellation.created_at.desc()).limit(10).all()
    
    # Get usage summary
    usage = R.get_usage_summary(s, user.id, days=30)
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "billing": billing,
        "profiles": [
            {
                "id": p.id,
                "name": p.name,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in profiles
        ],
        "constellations": [
            {
                "id": c.id,
                "name": c.name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in constellations
        ],
        "usage_30d": usage,
    }


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
class AuthCredentials(BaseModel):
    email: str
    password: str
    turnstile_token: Optional[str] = None  # Cloudflare Turnstile response
    invite_token: Optional[str] = None


class AgentTokenRequest(BaseModel):
    mem: Optional[bool] = True
    tools: Optional[bool] = True
    export: Optional[bool] = True


class RedeemInviteRequest(BaseModel):
    token: str


class OAuthExchangeRequest(BaseModel):
    provider: str
    id_token: str
    invite_token: Optional[str] = None


from synth_engine.api.turnstile import verify_turnstile_token_sync, is_turnstile_enabled


@app.post("/auth/register")
def register(
    request: Request,
    body: AuthCredentials = Body(...),
    s: Session = Depends(db),
):
    # Reject credentials in query params to avoid leaking into logs.
    if (
        request.query_params.get("email") is not None or
        request.query_params.get("password") is not None or
        request.query_params.get("turnstile_token") is not None
    ):
        raise HTTPException(400, "Credentials must be sent in JSON body")

    email = body.email
    password = body.password
    turnstile_token = body.turnstile_token
    invite_token = body.invite_token
    
    if not email or not password:
        raise HTTPException(400, "email and password required")
    
    # Verify Turnstile if enabled and token provided
    # If no token, allow through (fail open) - frontend may have had issues loading widget
    if is_turnstile_enabled() and turnstile_token:
        client_ip = request.client.host if request.client else None
        success, error = verify_turnstile_token_sync(turnstile_token, client_ip)
        if not success:
            raise HTTPException(403, error or "Bot protection verification failed")

    if invite_token:
        invite = R.get_invite_by_token(s, invite_token)
        if not invite:
            raise HTTPException(400, "Invalid invite")
        if invite.accepted_at:
            raise HTTPException(400, "Invite already used")
        if invite.expires_at and invite.expires_at < datetime.utcnow():
            raise HTTPException(400, "Invite expired")
    
    uid = new_id()
    try:
        if s.query(User).filter(User.email == email).first():
            raise HTTPException(400, "Email already registered")
        pw_hash = hash_password(password)
        user = User(id=uid, email=email, password_hash=pw_hash, tier="standard")
        s.add(user)
        s.commit()
        if invite_token:
            try:
                R.redeem_invite(s, invite_token, user.id)
            except ValueError as e:
                raise HTTPException(400, str(e))
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
def login(
    request: Request,
    body: AuthCredentials = Body(...),
    s: Session = Depends(db),
):
    # Reject credentials in query params to avoid leaking into logs.
    if (
        request.query_params.get("email") is not None or
        request.query_params.get("password") is not None or
        request.query_params.get("turnstile_token") is not None
    ):
        raise HTTPException(400, "Credentials must be sent in JSON body")

    email = body.email
    password = body.password
    turnstile_token = body.turnstile_token
    
    if not email or not password:
        raise HTTPException(400, "email and password required")
    
    # Verify Turnstile if enabled and token provided
    # If no token, allow through (fail open) - frontend may have had issues loading widget
    if is_turnstile_enabled() and turnstile_token:
        client_ip = request.client.host if request.client else None
        success, error = verify_turnstile_token_sync(turnstile_token, client_ip)
        if not success:
            raise HTTPException(403, error or "Bot protection verification failed")
    
    u = s.query(User).filter(User.email == email).first()
    if not u or not verify_password(password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_token(u.id)}


@app.post("/auth/agent-token")
def agent_token(
    body: AgentTokenRequest = Body(default=None),
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    tier = R.get_user_tier(s, user_id)
    if tier not in ("beta", "dev_admin"):
        if R.plan_for_user(s, user_id) == "free":
            raise HTTPException(403, "Invite required")
    scopes = ["agent:chat", "agent:tool", "agent:export"]
    req = body or AgentTokenRequest()
    return create_agent_token(
        user_id,
        scopes=scopes,
        mem=req.mem is not False,
        tools=req.tools is not False,
        export=req.export is not False,
    )


@app.post("/auth/redeem-invite")
def redeem_invite(
    body: RedeemInviteRequest = Body(...),
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    token = (body.token or "").strip()
    if not token:
        raise HTTPException(400, "Invite token required")
    try:
        invite = R.redeem_invite(s, token, user_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "ok": True,
        "email": invite.email,
        "accepted_at": invite.accepted_at.isoformat() if invite.accepted_at else None,
    }


@app.post("/auth/oauth/exchange")
async def oauth_exchange(
    body: OAuthExchangeRequest = Body(...),
    s: Session = Depends(db),
):
    provider = (body.provider or "").strip().lower()
    if provider not in ("google", "apple"):
        raise HTTPException(400, "Unsupported provider")
    if not body.id_token:
        raise HTTPException(400, "Missing id_token")

    if provider == "google":
        claims = await verify_google_id_token(body.id_token, settings.google_client_id)
        email_verified = claims.get("email_verified") in (True, "true", "True")
    else:
        claims = await verify_apple_id_token(body.id_token, settings.apple_client_id)
        email_verified = True

    email = (claims.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(401, "Email required")
    if not email_verified:
        raise HTTPException(401, "Email not verified")

    user = s.query(User).filter(User.email == email).first()
    if not user:
        user = User(id=new_id(), email=email, password_hash=hash_password(uuid.uuid4().hex), tier="standard")
        s.add(user)
        s.commit()

    if body.invite_token:
        try:
            R.redeem_invite(s, body.invite_token, user.id)
        except ValueError as e:
            raise HTTPException(400, str(e))

    return {
        "token": create_token(user.id),
        "user_id": user.id,
        "tier": user.tier,
    }


# -------------------------
# Tools (agent gateway)
# -------------------------
class ToolExportRequest(BaseModel):
    profile_id: Optional[str] = None
    include_family: Optional[bool] = False


@app.post("/tools/natal/export_full")
async def tool_natal_export_full(
    request: Request,
    x_user_id: str = Header(default=""),
    x_tool_timestamp: str = Header(default=""),
    x_tool_signature: str = Header(default=""),
    s: Session = Depends(db),
):
    if not x_user_id:
        raise HTTPException(400, "Missing x-user-id")

    raw_body = await request.body()
    _verify_tool_signature(x_user_id, raw_body, x_tool_timestamp, x_tool_signature)

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")

    args = payload.get("args") or {}
    if not isinstance(args, dict):
        raise HTTPException(400, "Invalid tool args")
    try:
        parsed = ToolExportRequest(**args)
    except ValidationError:
        raise HTTPException(400, "Invalid tool args")

    profile_id = parsed.profile_id
    include_family = bool(parsed.include_family)

    prof = None
    if profile_id:
        prof = s.query(Profile).filter(Profile.id == profile_id, Profile.user_id == x_user_id).first()
    if not prof:
        prof = R.get_latest_profile_for_user(s, x_user_id)
    if not prof:
        raise HTTPException(404, "Profile not found")

    export_payload = _build_natal_export_payload(s, prof, include_family=include_family)
    redacted = _redact_export_payload(export_payload)
    return redacted


def _verify_tool_signature(user_id: str, body: bytes, ts_header: str, sig_header: str) -> None:
    secret = settings.backend_hmac_secret
    if not secret:
        raise HTTPException(500, "Tool gateway not configured")
    if not ts_header or not sig_header:
        raise HTTPException(401, "Missing tool signature")
    try:
        ts = int(ts_header)
    except ValueError:
        raise HTTPException(401, "Invalid tool timestamp")
    now = int(datetime.now(timezone.utc).timestamp())
    if abs(now - ts) > 300:
        raise HTTPException(401, "Tool signature expired")
    payload = f"{ts}.{user_id}.{body.decode('utf-8')}"
    expected = _hmac_base64url(secret, payload)
    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(401, "Invalid tool signature")


def _hmac_base64url(secret: str, payload: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def _build_natal_export_payload(s: Session, prof: Profile, include_family: bool = False) -> Dict[str, Any]:
    try:
        person = json.loads(prof.person_json)
    except Exception:
        person = {}

    layers = {}
    for layer in ["natal_astro", "timing", "latent", "numerology", "humandesign", "genekeys", "symbolic"]:
        payload = R.latest_layer_payload(s, prof.id, layer)
        if payload is not None:
            layers[layer] = payload

    created_at = prof.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    export_payload = {
        "profile": {
            "name": prof.name,
            "created_at": created_at.astimezone(timezone.utc).isoformat() if created_at else None,
        },
        "person": person,
        "layers": layers,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "include_family": include_family,
    }
    return export_payload


def _redact_export_payload(value: Any, depth: int = 0) -> Any:
    if depth > 6:
        return "[truncated]"
    if isinstance(value, list):
        return [_redact_export_payload(v, depth + 1) for v in value[:80]]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            key = str(k).lower()
            if key in {"id", "user_id", "profile_id", "reading_id", "inputs_hash", "internal", "debug"}:
                continue
            if "token" in key or "secret" in key or "api_key" in key or key.endswith("_id"):
                continue
            out[k] = _redact_export_payload(v, depth + 1)
        return out
    if isinstance(value, str):
        return value if len(value) <= 2000 else f"{value[:2000]}..."
    return value


# -------------------------
# Profiles
# -------------------------
@app.get("/profiles")
def list_profiles(
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    profiles = (
        s.query(Profile)
        .filter(Profile.user_id == user_id)
        .order_by(Profile.created_at.desc())
        .all()
    )
    return {
        "profiles": [
            {
                "id": p.id,
                "name": p.name,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in profiles
        ]
    }


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
# TODO: replace with call to synth_engine.core.orchestrator.orchestrate
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
# Compute reading (paid - requires Integration tier)
# TODO: replace with call to synth_engine.core.orchestrator.orchestrate
# -------------------------
@app.post("/profiles/{profile_id}/compute_reading")
def compute_reading(
    profile_id: str,
    days: int = 14,
    include_symbolic: bool = True,
    user: User = Depends(require_plan("integration")),
    s: Session = Depends(db),
):
    _ = require_profile(s, user.id, profile_id)
    out = compute_profile_reading(s, profile_id, days=days, include_symbolic=include_symbolic)
    return out


# -------------------------
# Deterministic synthesis (free - no LLM required)
# -------------------------
@app.post("/profiles/{profile_id}/synthesis")
def profile_synthesis(
    profile_id: str,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    """
    Generate a deterministic synthesis from computed layers.
    
    Returns structured sections with citations. Does not require subscription.
    Call /compute_reading first to populate layers.
    """
    _ = require_profile(s, user_id, profile_id)
    try:
        result = synthesize_profile(s, profile_id)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))


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
def create_constellation(
    name: str,
    user: User = Depends(require_plan("constellation")),
    s: Session = Depends(db),
):
    c = R.create_constellation(s, user.id, name)
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
    user: User = Depends(require_plan("constellation")),
    s: Session = Depends(db),
):
    c = R.get_constellation_owned(s, constellation_id, user.id)
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


# -------------------------
# Constellation synthesis (free - deterministic)
# -------------------------
@app.post("/constellations/{constellation_id}/synthesis")
def constellation_synthesis(
    constellation_id: str,
    user_id: str = Depends(me_user_id),
    s: Session = Depends(db),
):
    """
    Generate a deterministic synthesis for a constellation.
    
    Returns structured sections with citations. Does not require subscription.
    Call /constellations/{id}/compute first to populate layers.
    """
    c = R.get_constellation_owned(s, constellation_id, user_id)
    if not c:
        raise HTTPException(404, "Constellation not found")
    try:
        result = synthesize_constellation(s, constellation_id)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))

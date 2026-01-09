from __future__ import annotations

import json
import uuid
import hashlib
import secrets
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
    WalletPass,
)

# Dev admin user ID constant retained for legacy compatibility
DEV_ADMIN_USER_ID = "dev-admin-00000000-0000-0000-0000-000000000000"


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


def latest_constellation_layer_payload(s: Session, constellation_id: str, layer: str) -> Optional[Dict[str, Any]]:
    """Get the latest payload for a constellation layer."""
    row = (
        s.query(ConstellationLayer)
        .filter(ConstellationLayer.constellation_id == constellation_id, ConstellationLayer.layer == layer)
        .order_by(desc(ConstellationLayer.created_at))
        .first()
    )
    if not row:
        return None
    try:
        return json.loads(row.payload_json)
    except Exception:
        return None


# -------------------------
# Stripe / Billing
# -------------------------
from synth_engine.storage.models import StripeCustomer, StripeSubscription, UsageLedger, ChatThread, ChatMessage, User, Invite


def ensure_stripe_customer(s: Session, user_id: str, email: str, stripe_customer_id: str) -> StripeCustomer:
    """Create or return existing StripeCustomer record."""
    existing = s.query(StripeCustomer).filter(StripeCustomer.user_id == user_id).first()
    if existing:
        return existing
    sc = StripeCustomer(id=new_id(), user_id=user_id, stripe_customer_id=stripe_customer_id)
    s.add(sc)
    s.commit()
    return sc


def get_stripe_customer_id(s: Session, user_id: str) -> Optional[str]:
    """Get stripe_customer_id for a user, or None if not linked."""
    sc = s.query(StripeCustomer).filter(StripeCustomer.user_id == user_id).first()
    return sc.stripe_customer_id if sc else None


def get_user_id_by_stripe_customer(s: Session, stripe_customer_id: str) -> Optional[str]:
    """Reverse lookup: get user_id from stripe_customer_id."""
    sc = s.query(StripeCustomer).filter(StripeCustomer.stripe_customer_id == stripe_customer_id).first()
    return sc.user_id if sc else None


def upsert_subscription_from_stripe(s: Session, stripe_customer_id: str, sub_obj: Dict[str, Any]) -> Optional[StripeSubscription]:
    """Create or update subscription from Stripe webhook payload."""
    user_id = get_user_id_by_stripe_customer(s, stripe_customer_id)
    if not user_id:
        return None

    stripe_sub_id = sub_obj.get("id")
    status = sub_obj.get("status", "unknown")
    price_id = None
    items = sub_obj.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")
    current_period_end = sub_obj.get("current_period_end")
    cancel_at_period_end = sub_obj.get("cancel_at_period_end", False)

    existing = s.query(StripeSubscription).filter(StripeSubscription.stripe_subscription_id == stripe_sub_id).first()
    if existing:
        existing.status = status
        existing.price_id = price_id
        if current_period_end:
            existing.current_period_end = datetime.utcfromtimestamp(current_period_end)
        existing.cancel_at_period_end = cancel_at_period_end
        existing.updated_at = datetime.utcnow()
        s.commit()
        return existing
    else:
        sub = StripeSubscription(
            id=new_id(),
            user_id=user_id,
            stripe_subscription_id=stripe_sub_id,
            status=status,
            price_id=price_id,
            current_period_end=datetime.utcfromtimestamp(current_period_end) if current_period_end else None,
            cancel_at_period_end=cancel_at_period_end,
        )
        s.add(sub)
        s.commit()
        return sub


# Plan tier names and hierarchy
# insight (BASIC price) < integration (PRO price) < constellation (FAMILY price)
PLAN_NAMES = {
    "free": "Free",
    "insight": "Insight",
    "integration": "Integration",
    "constellation": "Constellation",
    "beta": "Beta",
}

VALID_USER_TIERS = {"standard", "beta", "dev_admin"}


def is_dev_admin_user_id(s: Session, user_id: Optional[str]) -> bool:
    from synth_engine.config import settings
    if not user_id:
        return False
    if not settings.dev_admin_enabled or not settings.dev_admin_email:
        return False
    return (
        s.query(User)
        .filter(User.id == user_id, User.email == settings.dev_admin_email)
        .first()
        is not None
    )


def get_user_tier(s: Session, user_id: str) -> str:
    if is_dev_admin_user_id(s, user_id):
        return "dev_admin"
    user = s.query(User).filter(User.id == user_id).first()
    return user.tier if user else "standard"


def set_user_tier(s: Session, user_id: str, tier: str) -> None:
    if tier not in VALID_USER_TIERS:
        raise ValueError("Invalid tier")
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    user.tier = tier
    s.commit()


def _hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_invite(s: Session, email: str, created_by: str, ttl_hours: int = 168) -> tuple[Invite, str]:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_invite_token(token)
    expires_at = datetime.utcnow() + timedelta(hours=ttl_hours) if ttl_hours else None
    invite = Invite(
        id=new_id(),
        email=email,
        token_hash=token_hash,
        expires_at=expires_at,
        accepted_at=None,
        created_by=created_by,
    )
    s.add(invite)
    s.commit()
    return invite, token


def list_invites(s: Session, limit: int = 100) -> List[Invite]:
    limit = _clamp_limit(limit, default=100, max_limit=500)
    return (
        s.query(Invite)
        .order_by(Invite.created_at.desc())
        .limit(limit)
        .all()
    )


def get_invite_by_token(s: Session, token: str) -> Optional[Invite]:
    return s.query(Invite).filter(Invite.token_hash == _hash_invite_token(token)).first()


def redeem_invite(s: Session, token: str, user_id: str) -> Invite:
    invite = s.query(Invite).filter(Invite.token_hash == _hash_invite_token(token)).first()
    if not invite:
        raise ValueError("Invalid invite")
    if invite.accepted_at:
        raise ValueError("Invite already used")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise ValueError("Invite expired")
    invite.accepted_at = datetime.utcnow()
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    user.tier = "beta"
    s.commit()
    return invite


# -------------------------
# Wallet passes
# -------------------------
def get_wallet_pass_by_fingerprint(s: Session, fingerprint: str) -> Optional[WalletPass]:
    return s.query(WalletPass).filter(WalletPass.fingerprint == fingerprint).first()


def get_wallet_pass_by_user_profile(s: Session, user_id: str, profile_id: str) -> Optional[WalletPass]:
    return (
        s.query(WalletPass)
        .filter(WalletPass.user_id == user_id, WalletPass.profile_id == profile_id)
        .first()
    )


def create_wallet_pass(
    s: Session,
    user_id: str,
    profile_id: str,
    fingerprint: str,
    pass_serial: str,
    auth_token_hash: str,
) -> WalletPass:
    wp = WalletPass(
        id=new_id(),
        user_id=user_id,
        profile_id=profile_id,
        fingerprint=fingerprint,
        pass_serial=pass_serial,
        auth_token_hash=auth_token_hash,
        revoked_at=None,
    )
    s.add(wp)
    s.commit()
    return wp


def update_wallet_pass_token(
    s: Session,
    wallet_pass: WalletPass,
    auth_token_hash: str,
) -> WalletPass:
    wallet_pass.auth_token_hash = auth_token_hash
    wallet_pass.revoked_at = None
    s.commit()
    return wallet_pass


def revoke_wallet_pass(s: Session, wallet_pass: WalletPass) -> WalletPass:
    wallet_pass.revoked_at = datetime.utcnow()
    s.commit()
    return wallet_pass


def plan_for_user(s: Session, user_id: str) -> str:
    """
    Returns the plan key for a user based on their active subscription.
    Maps price_id → plan key (free/insight/integration/constellation).
    """
    from synth_engine.config import settings
    
    # Dev admin bypass - always constellation
    if is_dev_admin_user_id(s, user_id):
        return "constellation"
    # Beta tier bypass
    if get_user_tier(s, user_id) == "beta":
        return "beta"

    sub = (
        s.query(StripeSubscription)
        .filter(
            StripeSubscription.user_id == user_id,
            StripeSubscription.status.in_(("active", "trialing")),
        )
        .first()
    )
    if not sub or not sub.price_id:
        return "free"

    # Map price_id to plan key (env var names unchanged, semantic names updated)
    price_to_plan = {
        settings.stripe_price_basic: "insight",
        settings.stripe_price_pro: "integration",
        settings.stripe_price_family: "constellation",
        "beta": "beta",
        "pro": "integration",
    }
    return price_to_plan.get(sub.price_id, "free")


def get_active_subscription(s: Session, user_id: str) -> Optional[StripeSubscription]:
    """Get the active subscription for a user, if any."""
    return (
        s.query(StripeSubscription)
        .filter(
            StripeSubscription.user_id == user_id,
            StripeSubscription.status.in_(("active", "trialing")),
        )
        .first()
    )


def _feature_flags_for_plan(plan: str) -> Dict[str, bool]:
    """Return feature flags based on plan tier."""
    # Plan hierarchy: free < insight < integration < constellation
    is_paid = plan in ("insight", "integration", "constellation", "beta")
    is_integration = plan in ("integration", "constellation", "beta")
    is_constellation = plan in ("constellation", "beta")
    
    return {
        "synthesis_profile": True,  # Free for all
        "synthesis_constellation": True,  # Free for all
        "compute_reading": is_integration,  # Integration+
        "temporal_overlays": is_integration,  # Integration+
        "state_models": is_integration,  # Integration+
        "constellation_create": is_constellation,  # Constellation only
        "constellation_compute": is_constellation,  # Constellation only
        "ai_preview_allowed": is_paid,  # Any paid tier gets preview
        "ai_full_allowed": is_constellation,  # Only Constellation gets full AI
    }


def get_billing_status(s: Session, user_id: str) -> Dict[str, Any]:
    """Get billing status for a user."""
    # Dev admin bypass - return full constellation access
    if is_dev_admin_user_id(s, user_id):
        return {
            "has_stripe": True,
            "subscription": {"status": "active", "price_id": "dev_admin", "current_period_end": None, "cancel_at_period_end": False},
            "entitled": True,
            "plan_key": "constellation",
            "plan_name": "Constellation (Dev Admin)",
            "feature_flags": _feature_flags_for_plan("constellation"),
        }

    if get_user_tier(s, user_id) == "beta":
        return {
            "has_stripe": False,
            "subscription": None,
            "entitled": True,
            "plan_key": "beta",
            "plan_name": PLAN_NAMES.get("beta", "Beta"),
            "feature_flags": _feature_flags_for_plan("beta"),
        }
    
    customer = s.query(StripeCustomer).filter(StripeCustomer.user_id == user_id).first()
    plan = "free"
    
    if not customer:
        return {
            "has_stripe": False,
            "subscription": None,
            "entitled": False,
            "plan_key": plan,
            "plan_name": PLAN_NAMES.get(plan, "Free"),
            "feature_flags": _feature_flags_for_plan(plan),
        }

    sub = (
        s.query(StripeSubscription)
        .filter(StripeSubscription.user_id == user_id)
        .order_by(desc(StripeSubscription.updated_at))
        .first()
    )
    if not sub:
        return {
            "has_stripe": True,
            "subscription": None,
            "entitled": False,
            "plan_key": plan,
            "plan_name": PLAN_NAMES.get(plan, "Free"),
            "feature_flags": _feature_flags_for_plan(plan),
        }

    entitled = sub.status in ("active", "trialing")
    plan = plan_for_user(s, user_id) if entitled else "free"
    return {
        "has_stripe": True,
        "subscription": {
            "status": sub.status,
            "price_id": sub.price_id,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end,
        },
        "entitled": entitled,
        "plan_key": plan,
        "plan_name": PLAN_NAMES.get(plan, "Free"),
        "feature_flags": _feature_flags_for_plan(plan),
    }


def is_entitled(s: Session, user_id: str, action: str) -> bool:
    """
    Check if user is entitled to perform an action.
    - Dev admin: always entitled
    - If they have an active/trialing subscription, always entitled.
    - Otherwise, check free tier limits via UsageLedger.
    """
    from synth_engine.config import settings
    
    # Dev admin bypass - always entitled
    if is_dev_admin_user_id(s, user_id):
        return True
    if get_user_tier(s, user_id) == "beta":
        return True

    sub = (
        s.query(StripeSubscription)
        .filter(StripeSubscription.user_id == user_id, StripeSubscription.status.in_(("active", "trialing")))
        .first()
    )
    if sub:
        return True

    # Free tier: check daily usage
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    usage_today = (
        s.query(UsageLedger)
        .filter(
            UsageLedger.user_id == user_id,
            UsageLedger.action == action,
            UsageLedger.created_at >= today_start,
        )
        .count()
    )

    if action == "ai_chat":
        return usage_today < settings.free_chat_daily_limit
    elif action in ("compute_reading", "constellation_compute"):
        return usage_today < settings.free_compute_daily_limit
    else:
        return True  # Unknown actions allowed by default


def record_usage(s: Session, user_id: str, action: str, units: int = 1, meta: Optional[Dict[str, Any]] = None) -> Optional[UsageLedger]:
    """Record usage in the ledger. Skips for dev admin (not a real DB user)."""
    # Skip recording for dev admin
    if is_dev_admin_user_id(s, user_id):
        return None
    
    entry = UsageLedger(
        id=new_id(),
        user_id=user_id,
        action=action,
        units=units,
        meta_json=json.dumps(meta or {}),
    )
    s.add(entry)
    s.commit()
    return entry


def get_usage_summary(s: Session, user_id: str, days: int = 30) -> Dict[str, int]:
    """Get usage summary for a user over the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = s.query(UsageLedger).filter(UsageLedger.user_id == user_id, UsageLedger.created_at >= cutoff).all()
    summary: Dict[str, int] = {}
    for r in rows:
        summary[r.action] = summary.get(r.action, 0) + r.units
    return summary


# -------------------------
# AI Chat
# -------------------------

# In-memory storage for dev admin chat (not persisted)
_dev_admin_threads: Dict[str, ChatThread] = {}
_dev_admin_messages: Dict[str, List[ChatMessage]] = {}


def create_chat_thread(
    s: Session,
    user_id: str,
    profile_id: Optional[str] = None,
    constellation_id: Optional[str] = None,
    title: str = "",
) -> ChatThread:
    """Create a chat thread. For dev admin, uses in-memory storage."""
    thread_id = new_id()
    thread = ChatThread(
        id=thread_id,
        user_id=user_id,
        profile_id=profile_id,
        constellation_id=constellation_id,
        title=title,
    )
    
    # Dev admin: store in memory
    if is_dev_admin_user_id(s, user_id):
        _dev_admin_threads[thread_id] = thread
        _dev_admin_messages[thread_id] = []
        return thread
    
    s.add(thread)
    s.commit()
    return thread


def get_chat_thread(s: Session, thread_id: str, user_id: str) -> Optional[ChatThread]:
    # Dev admin: check in-memory first
    if is_dev_admin_user_id(s, user_id) and thread_id in _dev_admin_threads:
        return _dev_admin_threads[thread_id]
    
    return (
        s.query(ChatThread)
        .filter(ChatThread.id == thread_id, ChatThread.user_id == user_id)
        .first()
    )


def add_chat_message(
    s: Session,
    thread_id: str,
    role: str,
    content: str,
    citations: Optional[List[Dict[str, Any]]] = None,
) -> ChatMessage:
    """Add a message to a chat thread. For dev admin threads, uses in-memory storage."""
    msg = ChatMessage(
        id=new_id(),
        thread_id=thread_id,
        role=role,
        content=content,
        citations_json=json.dumps(citations or []),
    )
    
    # Dev admin: store in memory
    if thread_id in _dev_admin_messages:
        _dev_admin_messages[thread_id].append(msg)
        return msg
    
    s.add(msg)
    s.commit()
    return msg


def get_chat_messages(s: Session, thread_id: str, limit: int = 50) -> List[ChatMessage]:
    """Get messages for a thread. For dev admin threads, uses in-memory storage."""
    # Dev admin: check in-memory first
    if thread_id in _dev_admin_messages:
        messages = _dev_admin_messages[thread_id]
        return messages[-limit:] if len(messages) > limit else messages
    
    return (
        s.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at)
        .limit(limit)
        .all()
    )


def list_chat_threads(
    s: Session,
    user_id: str,
    limit: int = 50,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
) -> Tuple[List[ChatThread], Optional[str], Optional[str]]:
    limit = _clamp_limit(limit)
    bts, bid = parse_keyset(before_ts, before_id)
    q = s.query(ChatThread).filter(ChatThread.user_id == user_id).order_by(desc(ChatThread.created_at), desc(ChatThread.id))
    if bts is not None and bid is not None:
        q = q.filter(or_(ChatThread.created_at < bts, and_(ChatThread.created_at == bts, ChatThread.id < bid)))
    rows = q.limit(limit).all()
    next_ts = next_id = None
    if len(rows) == limit:
        last = rows[-1]
        next_ts = to_utc_iso(last.created_at)
        next_id = last.id
    return rows, next_ts, next_id


# -------------------------
# Admin helpers
# -------------------------
def list_users_paginated(
    s: Session,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[User], int]:
    total = s.query(User).count()
    users = s.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return users, total


def set_user_role(s: Session, user_id: str, role: str) -> Optional[User]:
    from synth_engine.storage.models import UserRole
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.role = UserRole(role)
    s.commit()
    return user

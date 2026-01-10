from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, Float, Boolean, Enum, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from synth_engine.storage.db import Base


def utcnow():
    # Use naive UTC timestamps so this works with Postgres columns created as
    # TIMESTAMP WITHOUT TIME ZONE (alembic migration uses sa.DateTime()).
    return datetime.utcnow()


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"
    clinician = "clinician"


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PasswordResetToken(Base):
    """Stores password reset codes with expiration."""
    __tablename__ = "password_reset_tokens"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(6), index=True)  # 6-digit code
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    person_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Reading(Base):
    __tablename__ = "readings"
    __table_args__ = (Index("ix_readings_profile_created_id", "profile_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    as_of: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ComputedLayer(Base):
    __tablename__ = "computed_layers"
    __table_args__ = (Index("ix_layers_profile_layer_created_id", "profile_id", "layer", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    reading_id: Mapped[str] = mapped_column(String, ForeignKey("readings.id"), index=True)

    layer: Mapped[str] = mapped_column(String, index=True)
    as_of: Mapped[str] = mapped_column(String, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    inputs_hash: Mapped[str] = mapped_column(String, index=True)
    version: Mapped[str] = mapped_column(String, default="1.0.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CheckIn(Base):
    __tablename__ = "checkins"
    __table_args__ = (Index("ix_checkins_profile_created_id", "profile_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    ts: Mapped[str] = mapped_column(String, index=True)

    stress: Mapped[int] = mapped_column(Integer)
    mood: Mapped[int] = mapped_column(Integer)
    energy: Mapped[int] = mapped_column(Integer)
    sleep_quality: Mapped[int] = mapped_column(Integer)

    notes: Mapped[str] = mapped_column(String, default="")
    source: Mapped[str] = mapped_column(String, default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class StateModel(Base):
    __tablename__ = "state_models"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), unique=True, index=True)

    w_user: Mapped[float] = mapped_column(Float, default=0.60)
    w_timing: Mapped[float] = mapped_column(Float, default=0.20)
    w_context: Mapped[float] = mapped_column(Float, default=0.20)

    stress_bias: Mapped[float] = mapped_column(Float, default=0.0)
    stress_scale: Mapped[float] = mapped_column(Float, default=1.0)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"
    __table_args__ = (Index("ix_clinical_profile_created_id", "profile_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    ts: Mapped[str] = mapped_column(String, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String, default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"
    __table_args__ = (Index("ix_telemetry_profile_created_id", "profile_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    ts: Mapped[str] = mapped_column(String, index=True)

    page: Mapped[str] = mapped_column(String, default="")
    dwell_ms: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    scroll_depth: Mapped[int] = mapped_column(Integer, default=0)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    context_json: Mapped[str] = mapped_column(Text, default="{}")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Constellation(Base):
    __tablename__ = "constellations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ConstellationMember(Base):
    """
    Explicit nodes of a constellation.
    """
    __tablename__ = "constellation_members"
    __table_args__ = (
        UniqueConstraint("constellation_id", "profile_id", name="uq_constellation_member"),
        Index("ix_member_constellation_profile", "constellation_id", "profile_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    constellation_id: Mapped[str] = mapped_column(String, ForeignKey("constellations.id"), index=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    role: Mapped[str] = mapped_column(String, default="member")  # parent|child|partner|sibling|etc
    meta_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ConstellationEdge(Base):
    __tablename__ = "constellation_edges"
    __table_args__ = (
        UniqueConstraint(
            "constellation_id",
            "from_profile_id",
            "to_profile_id",
            "relationship",
            name="uq_constellation_edge",
        ),
        Index("ix_edge_constellation_from_to", "constellation_id", "from_profile_id", "to_profile_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    constellation_id: Mapped[str] = mapped_column(String, ForeignKey("constellations.id"), index=True)
    from_profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    to_profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    relationship: Mapped[str] = mapped_column(String, default="related")
    meta_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ConstellationRun(Base):
    __tablename__ = "constellation_runs"
    __table_args__ = (Index("ix_constellation_runs_created_id", "constellation_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    constellation_id: Mapped[str] = mapped_column(String, ForeignKey("constellations.id"), index=True)
    as_of: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ConstellationLayer(Base):
    __tablename__ = "constellation_layers"
    __table_args__ = (
        Index("ix_constellation_layers_created_id", "constellation_id", "created_at", "id"),
        Index("ix_constellation_layers_run_created_id", "constellation_id", "run_id", "created_at", "id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    constellation_id: Mapped[str] = mapped_column(String, ForeignKey("constellations.id"), index=True)
    run_id: Mapped[str] = mapped_column(String, ForeignKey("constellation_runs.id"), index=True)

    layer: Mapped[str] = mapped_column(String, index=True)  # constellation|bowen|curriculum|jung_summary
    as_of: Mapped[str] = mapped_column(String, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    inputs_hash: Mapped[str] = mapped_column(String, index=True)
    version: Mapped[str] = mapped_column(String, default="1.0.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# -------------------------
# Wallet Passes
# -------------------------
class WalletPass(Base):
    __tablename__ = "wallet_passes"
    __table_args__ = (
        UniqueConstraint("fingerprint", name="uq_wallet_pass_fingerprint"),
        UniqueConstraint("pass_serial", name="uq_wallet_pass_serial"),
        Index("ix_wallet_pass_user_profile", "user_id", "profile_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    profile_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), index=True)
    fingerprint: Mapped[str] = mapped_column(String, nullable=False, index=True)
    pass_serial: Mapped[str] = mapped_column(String, nullable=False, index=True)
    device_library_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    auth_token_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# -------------------------
# Beta Invites
# -------------------------
class Invite(Base):
    __tablename__ = "invites"
    __table_args__ = (
        Index("ix_invites_email_created", "email", "created_at", "id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, index=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# -------------------------
# Stripe Billing
# -------------------------
class StripeCustomer(Base):
    __tablename__ = "stripe_customers"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    stripe_customer_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class StripeSubscription(Base):
    __tablename__ = "stripe_subscriptions"
    __table_args__ = (Index("ix_stripe_sub_user_status", "user_id", "status"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    stripe_subscription_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, index=True)
    price_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# -------------------------
# Usage Ledger
# -------------------------
class UsageLedger(Base):
    __tablename__ = "usage_ledger"
    __table_args__ = (Index("ix_usage_user_action_created", "user_id", "action", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String, nullable=False, index=True)
    units: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    meta_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# -------------------------
# AI Chat
# -------------------------
class ChatThread(Base):
    __tablename__ = "chat_threads"
    __table_args__ = (Index("ix_chat_threads_user_created", "user_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    profile_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("profiles.id"), nullable=True, index=True)
    constellation_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("constellations.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_thread_created", "thread_id", "created_at", "id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    thread_id: Mapped[str] = mapped_column(String, ForeignKey("chat_threads.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False)  # user | assistant | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# -------------------------
# Stripe Webhook Idempotency
# -------------------------
class StripeWebhookEvent(Base):
    __tablename__ = "stripe_webhook_events"
    event_id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

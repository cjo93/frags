from __future__ import annotations

from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, Float, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from synth_engine.storage.db import Base


def utcnow():
    # Use naive UTC timestamps so this works with Postgres columns created as
    # TIMESTAMP WITHOUT TIME ZONE (alembic migration uses sa.DateTime()).
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


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

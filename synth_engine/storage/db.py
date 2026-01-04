from sqlalchemy import create_engine
from sqlalchemy.exc import ArgumentError
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from synth_engine.config import settings

def _create_engine_from_settings():
    try:
        return create_engine(settings.database_url, future=True)
    except ArgumentError:
        fallback = "sqlite:///./synth.db"
        print(
            f"WARN: invalid SYNTH_DATABASE_URL={settings.database_url!r}; falling back to {fallback!r}",
            flush=True,
        )
        return create_engine(fallback, future=True)


engine = _create_engine_from_settings()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

class Base(DeclarativeBase):
    pass

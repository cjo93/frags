import secrets

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SYNTH_", extra="ignore")

    database_url: str = "sqlite:///./synth.db"

    @field_validator("database_url", mode="before")
    @classmethod
    def _clean_database_url(cls, value):
        if value is None:
            return "sqlite:///./synth.db"
        if isinstance(value, str):
            cleaned = value.strip()
            return cleaned or "sqlite:///./synth.db"
        return value

    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60 * 24 * 7

    zodiac: str = "tropical"
    house_systems: str = "P,WS"
    aspect_max_orb_deg: float = 3.0
    timing_orb_tight: float = 1.5
    timing_orb_medium: float = 3.0

settings = Settings()

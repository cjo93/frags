from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SYNTH_", extra="ignore")

    database_url: str = "sqlite:///./synth.db"

    jwt_secret: str = "CHANGE_ME"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60 * 24 * 7

    zodiac: str = "tropical"
    house_systems: str = "P,WS"
    aspect_max_orb_deg: float = 3.0
    timing_orb_tight: float = 1.5
    timing_orb_medium: float = 3.0

settings = Settings()

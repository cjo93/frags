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

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_basic: str = ""
    stripe_price_pro: str = ""
    stripe_price_family: str = ""

    # URLs
    app_base_url: str = "https://defrag.app"
    api_base_url: str = "https://api.defrag.app"

    # OpenAI (for AI synthesis)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Free tier limits
    free_chat_daily_limit: int = 10
    free_compute_daily_limit: int = 3

    # Dev admin bypass (for founder testing without Stripe)
    # SECURITY: Must set both enable flag AND secret token
    # Never enable in production unless emergency debugging needed
    dev_admin_enabled: bool = False
    dev_admin_token: str = ""  # Must be 32+ char random secret, NOT "DEV_ADMIN"
    dev_admin_email: str = ""  # Email to associate with dev admin session
    
    # Admin mutations (impersonation, plan override, etc.)
    # Separate gate for sensitive write operations
    admin_mutations_enabled: bool = False

    # Astrology config
    zodiac: str = "tropical"
    house_systems: str = "P,WS"
    aspect_max_orb_deg: float = 3.0
    timing_orb_tight: float = 1.5
    timing_orb_medium: float = 3.0


settings = Settings()

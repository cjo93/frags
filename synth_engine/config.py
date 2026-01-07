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
    agent_jwt_secret: str = ""
    agent_jwt_issuer: str = "defrag-api"
    agent_jwt_audience: str = "agent-worker"
    agent_jwt_exp_minutes: int = 15

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_basic: str = ""
    stripe_price_pro: str = ""
    stripe_price_family: str = ""

    # URLs
    app_base_url: str = "https://defrag.app"
    api_base_url: str = "https://api.defrag.app"

    # AI Provider configuration
    # SYNTH_AI_PROVIDER: disabled | cloudflare | serverless_gpu | openai | gemini | auto
    # "auto" = try cloudflare first, then openai, then disabled
    ai_provider: str = "auto"
    
    # Cloudflare Workers AI (recommended - free tier available)
    # https://developers.cloudflare.com/workers-ai/
    cloudflare_account_id: str = ""
    cloudflare_api_token: str = ""
    cloudflare_chat_model: str = "@cf/meta/llama-3.1-8b-instruct"
    cloudflare_embed_model: str = "@cf/baai/bge-large-en-v1.5"
    cloudflare_image_model: str = "@cf/stabilityai/stable-diffusion-xl-base-1.0"
    cloudflare_stt_model: str = "@cf/openai/whisper"  # Speech-to-text
    cloudflare_tts_model: str = ""  # Text-to-speech (not yet available on CF)
    
    # OpenAI (for AI synthesis) - used when ai_provider=openai or auto
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    
    # Serverless GPU (vendor-neutral) - used when ai_provider=serverless_gpu
    # Works with Modal, RunPod, Replicate, Together, or any OpenAI-compatible endpoint
    serverless_gpu_api_key: str = ""
    serverless_gpu_endpoint: str = ""  # e.g., https://your-endpoint.modal.run
    
    # AI model overrides (optional)
    ai_default_model: str = ""  # Override default chat model
    ai_image_model: str = ""    # Model for image generation
    ai_vision_model: str = ""   # Model for vision/multimodal
    
    # Feature flags for multimedia
    ai_image_enabled: bool = False  # Enable /ai/image endpoint
    ai_audio_enabled: bool = False  # Enable /ai/transcribe and /ai/speak endpoints

    # Cloudflare Turnstile (bot protection)
    # https://developers.cloudflare.com/turnstile/
    turnstile_secret_key: str = ""  # Server-side secret key
    turnstile_enabled: bool = False  # Enable turnstile verification on register/login

    # Free tier limits
    free_chat_daily_limit: int = 10
    free_compute_daily_limit: int = 3

    # Dev admin bypass (for founder testing without Stripe)
    # SECURITY: Must set both enable flag AND secret token
    # Never enable in production unless emergency debugging needed
    dev_admin_enabled: bool = False
    dev_admin_token: str = ""  # Must be 32+ char random secret, NOT "DEV_ADMIN"
    dev_admin_email: str = ""  # Email to associate with dev admin session
    dev_admin_expires_at: str = ""  # ISO datetime, e.g. "2026-01-06T00:00:00Z" - auto-disable after this time
    
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

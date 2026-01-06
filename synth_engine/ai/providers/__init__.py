"""AI Provider abstraction for multi-vendor support."""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from synth_engine.config import Settings

from synth_engine.ai.providers.base import AIProvider
from synth_engine.ai.providers.disabled import DisabledProvider
from synth_engine.ai.providers.serverless_gpu import ServerlessGPUProvider
from synth_engine.ai.providers.openai_provider import OpenAIProvider
from synth_engine.ai.providers.cloudflare import CloudflareProvider


def get_ai_provider(settings: "Settings") -> AIProvider:
    """
    Factory function to get the configured AI provider.
    
    Provider selection order:
    1. SYNTH_AI_PROVIDER env var (explicit choice)
    2. "auto" mode: try cloudflare → openai → disabled
    
    Security: Never accepts provider keys from browser.
    All keys must be server-side env vars.
    """
    provider_name = settings.ai_provider.lower()
    
    if provider_name == "disabled":
        return DisabledProvider()
    
    if provider_name == "cloudflare":
        if not settings.cloudflare_account_id or not settings.cloudflare_api_token:
            return DisabledProvider()
        return CloudflareProvider(
            account_id=settings.cloudflare_account_id,
            api_token=settings.cloudflare_api_token,
            chat_model=settings.cloudflare_chat_model,
            embed_model=settings.cloudflare_embed_model,
            image_model=settings.cloudflare_image_model,
            stt_model=settings.cloudflare_stt_model,
            tts_model=settings.cloudflare_tts_model,
        )
    
    if provider_name == "serverless_gpu":
        if not settings.serverless_gpu_api_key or not settings.serverless_gpu_endpoint:
            return DisabledProvider()
        return ServerlessGPUProvider(
            api_key=settings.serverless_gpu_api_key,
            endpoint=settings.serverless_gpu_endpoint,
            default_model=settings.ai_default_model,
        )
    
    if provider_name == "openai":
        if not settings.openai_api_key:
            return DisabledProvider()
        return OpenAIProvider(
            api_key=settings.openai_api_key,
            default_model=settings.openai_model or settings.ai_default_model or "gpt-4o-mini",
        )
    
    if provider_name == "gemini":
        # Future: implement GeminiProvider
        return DisabledProvider()
    
    # Auto mode: try providers in order of preference
    if provider_name == "auto":
        # 1. Try Cloudflare (free tier, recommended)
        if settings.cloudflare_account_id and settings.cloudflare_api_token:
            return CloudflareProvider(
                account_id=settings.cloudflare_account_id,
                api_token=settings.cloudflare_api_token,
                chat_model=settings.cloudflare_chat_model,
                embed_model=settings.cloudflare_embed_model,
                image_model=settings.cloudflare_image_model,
                stt_model=settings.cloudflare_stt_model,
                tts_model=settings.cloudflare_tts_model,
            )
        
        # 2. Try OpenAI (backwards compat)
        if settings.openai_api_key:
            return OpenAIProvider(
                api_key=settings.openai_api_key,
                default_model=settings.openai_model or "gpt-4o-mini",
            )
    
    return DisabledProvider()


__all__ = [
    "AIProvider",
    "get_ai_provider",
    "DisabledProvider",
    "ServerlessGPUProvider", 
    "OpenAIProvider",
    "CloudflareProvider",
]

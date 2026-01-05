"""AI Provider abstraction for multi-vendor support."""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from synth_engine.config import Settings

from synth_engine.ai.providers.base import AIProvider
from synth_engine.ai.providers.disabled import DisabledProvider
from synth_engine.ai.providers.serverless_gpu import ServerlessGPUProvider
from synth_engine.ai.providers.openai_provider import OpenAIProvider


def get_ai_provider(settings: "Settings") -> AIProvider:
    """
    Factory function to get the configured AI provider.
    
    Provider selection order:
    1. SYNTH_AI_PROVIDER env var (explicit choice)
    2. Fall back to openai if OPENAI_API_KEY is set (backwards compat)
    3. Default to disabled
    
    Security: Never accepts provider keys from browser.
    All keys must be server-side env vars.
    """
    provider_name = settings.ai_provider.lower()
    
    if provider_name == "disabled":
        return DisabledProvider()
    
    if provider_name == "serverless_gpu":
        if not settings.serverless_gpu_api_key or not settings.serverless_gpu_endpoint:
            # Not configured - fall back to disabled
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
    
    # Backwards compatibility: if no provider specified but OpenAI key exists
    if provider_name == "auto" and settings.openai_api_key:
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
]

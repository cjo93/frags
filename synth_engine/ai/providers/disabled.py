"""Disabled AI Provider - safe default when no provider is configured."""
from __future__ import annotations

from typing import List, Optional

from synth_engine.ai.providers.base import (
    AIProvider,
    ChatMessage,
    ChatResponse,
    ProviderError,
)


class DisabledProvider(AIProvider):
    """
    Placeholder provider that returns "AI not configured" for all requests.
    
    This is the safe default:
    - Used when SYNTH_AI_PROVIDER=disabled
    - Used when no valid credentials are configured
    - Ensures the app doesn't crash, just returns a clear message
    """
    
    @property
    def name(self) -> str:
        return "disabled"
    
    @property
    def is_configured(self) -> bool:
        return False
    
    @property
    def supports_vision(self) -> bool:
        return False
    
    @property
    def supports_image_generation(self) -> bool:
        return False
    
    def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ChatResponse:
        """Always raises ProviderError since AI is not configured."""
        raise ProviderError(
            message="AI synthesis is not yet enabled. Use /profiles/{id}/synthesis for deterministic insights.",
            provider=self.name,
            status_code=503,
        )

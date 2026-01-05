"""OpenAI Provider - direct integration with OpenAI API."""
from __future__ import annotations

import logging
from typing import List, Optional, Union

from synth_engine.ai.providers.base import (
    AIProvider,
    ChatMessage,
    ChatResponse,
    VisionResponse,
    ImageGenerationResponse,
    ProviderError,
)

logger = logging.getLogger(__name__)


class OpenAIProvider(AIProvider):
    """
    Direct OpenAI API provider.
    
    Configure via:
    - SYNTH_OPENAI_API_KEY: Your OpenAI API key
    - SYNTH_OPENAI_MODEL: Default model (gpt-4o-mini)
    
    Supports:
    - Chat completions
    - Vision (with gpt-4o, gpt-4-vision-preview)
    - Image generation (DALL-E 3)
    """
    
    def __init__(
        self,
        api_key: str,
        default_model: str = "gpt-4o-mini",
        image_model: str = "dall-e-3",
        vision_model: str = "gpt-4o",
    ):
        self._api_key = api_key
        self._default_model = default_model
        self._image_model = image_model
        self._vision_model = vision_model
        self._client = None
    
    def _get_client(self):
        """Lazy-load OpenAI client."""
        if self._client is None:
            try:
                import openai
                self._client = openai.OpenAI(api_key=self._api_key)
            except ImportError:
                raise ProviderError(
                    message="OpenAI package not installed. Run: pip install openai",
                    provider=self.name,
                    status_code=500,
                )
        return self._client
    
    @property
    def name(self) -> str:
        return "openai"
    
    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)
    
    @property
    def supports_vision(self) -> bool:
        return True
    
    @property
    def supports_image_generation(self) -> bool:
        return True
    
    def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ChatResponse:
        """Send chat completion to OpenAI."""
        client = self._get_client()
        model_name = model or self._default_model
        
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": m.role, "content": m.content} for m in messages],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            
            content = response.choices[0].message.content or ""
            usage = None
            if response.usage:
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }
            
            return ChatResponse(
                content=content,
                model=model_name,
                usage=usage,
                raw=response,
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"OpenAI chat error: {error_msg}")
            
            # Parse common OpenAI errors
            status_code = 500
            if "rate_limit" in error_msg.lower():
                status_code = 429
            elif "invalid_api_key" in error_msg.lower():
                status_code = 401
            elif "context_length" in error_msg.lower():
                status_code = 400
            
            raise ProviderError(
                message=f"OpenAI error: {error_msg}",
                provider=self.name,
                status_code=status_code,
                raw_error=e,
            )
    
    def vision(
        self,
        messages: List[ChatMessage],
        images: List[Union[str, bytes]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> VisionResponse:
        """Send vision request to OpenAI."""
        client = self._get_client()
        model_name = model or self._vision_model
        
        # Build vision-formatted messages
        formatted_messages = []
        for m in messages:
            formatted_messages.append({"role": m.role, "content": m.content})
        
        # Add images to the last user message
        if images and formatted_messages:
            last_user_idx = None
            for i, msg in enumerate(formatted_messages):
                if msg["role"] == "user":
                    last_user_idx = i
            
            if last_user_idx is not None:
                content_parts = [{"type": "text", "text": formatted_messages[last_user_idx]["content"]}]
                for img in images:
                    if isinstance(img, str):
                        content_parts.append({"type": "image_url", "image_url": {"url": img}})
                    else:
                        import base64
                        b64 = base64.b64encode(img).decode("utf-8")
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                        })
                formatted_messages[last_user_idx]["content"] = content_parts
        
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            
            content = response.choices[0].message.content or ""
            
            return VisionResponse(
                content=content,
                model=model_name,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                } if response.usage else None,
                raw=response,
            )
            
        except Exception as e:
            logger.error(f"OpenAI vision error: {e}")
            raise ProviderError(
                message=f"Vision error: {str(e)}",
                provider=self.name,
                status_code=500,
                raw_error=e,
            )
    
    def image_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
    ) -> ImageGenerationResponse:
        """Generate image with DALL-E."""
        client = self._get_client()
        model_name = model or self._image_model
        
        try:
            response = client.images.generate(
                model=model_name,
                prompt=prompt,
                size=size,
                quality=quality,
                n=n,
            )
            
            image_data = response.data[0] if response.data else None
            
            return ImageGenerationResponse(
                url=image_data.url if image_data else None,
                b64_json=image_data.b64_json if image_data and hasattr(image_data, 'b64_json') else None,
                model=model_name,
                raw=response,
            )
            
        except Exception as e:
            logger.error(f"OpenAI image generation error: {e}")
            raise ProviderError(
                message=f"Image generation error: {str(e)}",
                provider=self.name,
                status_code=500,
                raw_error=e,
            )

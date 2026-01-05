"""Serverless GPU Provider - vendor-neutral adapter for inference endpoints."""
from __future__ import annotations

import logging
from typing import List, Optional, Union
import httpx

from synth_engine.ai.providers.base import (
    AIProvider,
    ChatMessage,
    ChatResponse,
    VisionResponse,
    ImageGenerationResponse,
    ProviderError,
)

logger = logging.getLogger(__name__)


class ServerlessGPUProvider(AIProvider):
    """
    Vendor-neutral adapter for serverless GPU inference endpoints.
    
    Supports any OpenAI-compatible API (Modal, RunPod, Replicate, Together, etc.)
    Configure via:
    - SYNTH_SERVERLESS_GPU_ENDPOINT: Base URL for the inference API
    - SYNTH_SERVERLESS_GPU_API_KEY: Bearer token for auth
    
    Expected endpoint format (OpenAI-compatible):
    POST {endpoint}/v1/chat/completions
    POST {endpoint}/v1/images/generations (if supported)
    
    Security:
    - Never logs API keys
    - All credentials server-side only
    """
    
    def __init__(
        self,
        api_key: str,
        endpoint: str,
        default_model: Optional[str] = None,
        timeout: float = 120.0,
    ):
        self._api_key = api_key
        self._endpoint = endpoint.rstrip("/")
        self._default_model = default_model or "default"
        self._timeout = timeout
        
        # Track capabilities (can be discovered or configured)
        self._supports_vision = False
        self._supports_image_gen = False
    
    @property
    def name(self) -> str:
        return "serverless_gpu"
    
    @property
    def is_configured(self) -> bool:
        return bool(self._api_key and self._endpoint)
    
    @property
    def supports_vision(self) -> bool:
        return self._supports_vision
    
    @property
    def supports_image_generation(self) -> bool:
        return self._supports_image_gen
    
    def _headers(self) -> dict:
        """Build auth headers. Never log the actual key."""
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
    
    def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ChatResponse:
        """
        Send chat completion to serverless endpoint.
        
        Uses OpenAI-compatible format for maximum compatibility.
        """
        url = f"{self._endpoint}/v1/chat/completions"
        model_name = model or self._default_model
        
        payload = {
            "model": model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, json=payload, headers=self._headers())
                
                if response.status_code != 200:
                    logger.error(f"Serverless GPU error: {response.status_code}")
                    raise ProviderError(
                        message=f"Inference endpoint returned {response.status_code}",
                        provider=self.name,
                        status_code=response.status_code,
                        raw_error=response.text[:500] if response.text else None,
                    )
                
                data = response.json()
                
                # Parse OpenAI-compatible response
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                usage = data.get("usage")
                
                return ChatResponse(
                    content=content,
                    model=model_name,
                    usage=usage,
                    raw=data,
                )
                
        except httpx.TimeoutException:
            raise ProviderError(
                message="Inference request timed out",
                provider=self.name,
                status_code=504,
            )
        except httpx.RequestError as e:
            raise ProviderError(
                message=f"Network error: {str(e)}",
                provider=self.name,
                status_code=502,
            )
    
    def vision(
        self,
        messages: List[ChatMessage],
        images: List[Union[str, bytes]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> VisionResponse:
        """
        Send vision request to serverless endpoint.
        
        Format follows OpenAI vision API structure.
        """
        if not self._supports_vision:
            raise ProviderError(
                message="Vision is not enabled for this serverless endpoint",
                provider=self.name,
                status_code=501,
            )
        
        url = f"{self._endpoint}/v1/chat/completions"
        model_name = model or self._default_model
        
        # Convert messages to vision format
        formatted_messages = []
        for m in messages:
            formatted_messages.append({"role": m.role, "content": m.content})
        
        # Add images to the last user message
        if images and formatted_messages:
            last_user_idx = None
            for i, m in enumerate(formatted_messages):
                if m["role"] == "user":
                    last_user_idx = i
            
            if last_user_idx is not None:
                content_parts = [{"type": "text", "text": formatted_messages[last_user_idx]["content"]}]
                for img in images:
                    if isinstance(img, str):
                        content_parts.append({"type": "image_url", "image_url": {"url": img}})
                    else:
                        # Base64 encode bytes
                        import base64
                        b64 = base64.b64encode(img).decode("utf-8")
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                        })
                formatted_messages[last_user_idx]["content"] = content_parts
        
        payload = {
            "model": model_name,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, json=payload, headers=self._headers())
                
                if response.status_code != 200:
                    raise ProviderError(
                        message=f"Vision endpoint returned {response.status_code}",
                        provider=self.name,
                        status_code=response.status_code,
                    )
                
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                return VisionResponse(
                    content=content,
                    model=model_name,
                    usage=data.get("usage"),
                    raw=data,
                )
                
        except httpx.TimeoutException:
            raise ProviderError(message="Vision request timed out", provider=self.name, status_code=504)
        except httpx.RequestError as e:
            raise ProviderError(message=f"Network error: {str(e)}", provider=self.name, status_code=502)
    
    def image_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
    ) -> ImageGenerationResponse:
        """
        Generate image via serverless endpoint.
        
        Uses OpenAI-compatible images/generations endpoint.
        """
        if not self._supports_image_gen:
            raise ProviderError(
                message="Image generation is not enabled for this serverless endpoint",
                provider=self.name,
                status_code=501,
            )
        
        url = f"{self._endpoint}/v1/images/generations"
        
        payload = {
            "model": model or self._default_model,
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "n": n,
        }
        
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, json=payload, headers=self._headers())
                
                if response.status_code != 200:
                    raise ProviderError(
                        message=f"Image generation returned {response.status_code}",
                        provider=self.name,
                        status_code=response.status_code,
                    )
                
                data = response.json()
                image_data = data.get("data", [{}])[0]
                
                return ImageGenerationResponse(
                    url=image_data.get("url"),
                    b64_json=image_data.get("b64_json"),
                    model=model or self._default_model,
                    raw=data,
                )
                
        except httpx.TimeoutException:
            raise ProviderError(message="Image generation timed out", provider=self.name, status_code=504)
        except httpx.RequestError as e:
            raise ProviderError(message=f"Network error: {str(e)}", provider=self.name, status_code=502)

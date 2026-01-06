"""Cloudflare Workers AI Provider - free tier with OpenAI-compatible API."""
from __future__ import annotations

import base64
import logging
from typing import List, Optional, Union
import httpx

from synth_engine.ai.providers.base import (
    AIProvider,
    ChatMessage,
    ChatResponse,
    VisionResponse,
    ImageGenerationResponse,
    TranscriptionResponse,
    SpeechResponse,
    ProviderError,
)

logger = logging.getLogger(__name__)


class CloudflareProvider(AIProvider):
    """
    Cloudflare Workers AI provider.
    
    Uses Cloudflare's OpenAI-compatible REST API:
    https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions
    
    Configure via:
    - SYNTH_CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
    - SYNTH_CLOUDFLARE_API_TOKEN: API token with Workers AI permissions
    - SYNTH_CLOUDFLARE_CHAT_MODEL: Model for chat (default: @cf/meta/llama-3.1-8b-instruct)
    - SYNTH_CLOUDFLARE_EMBED_MODEL: Model for embeddings (default: @cf/baai/bge-large-en-v1.5)
    - SYNTH_CLOUDFLARE_IMAGE_MODEL: Model for images (default: @cf/stabilityai/stable-diffusion-xl-base-1.0)
    - SYNTH_CLOUDFLARE_STT_MODEL: Model for speech-to-text (default: @cf/openai/whisper)
    
    Free tier includes:
    - 10,000 neurons/day for most models
    - No credit card required
    
    Security:
    - Never logs API tokens
    - All credentials server-side only
    """
    
    def __init__(
        self,
        account_id: str,
        api_token: str,
        chat_model: str = "@cf/meta/llama-3.1-8b-instruct",
        embed_model: str = "@cf/baai/bge-large-en-v1.5",
        image_model: str = "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        stt_model: str = "@cf/openai/whisper",
        tts_model: str = "",  # Not yet available on CF
        timeout: float = 60.0,
    ):
        self._account_id = account_id
        self._api_token = api_token
        self._chat_model = chat_model
        self._embed_model = embed_model
        self._image_model = image_model
        self._stt_model = stt_model
        self._tts_model = tts_model
        self._timeout = timeout
        
        # Base URL for Cloudflare Workers AI OpenAI-compatible endpoint
        self._base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1"
        # Native endpoint for non-OpenAI-compatible APIs
        self._native_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run"
    
    @property
    def name(self) -> str:
        return "cloudflare"
    
    @property
    def is_configured(self) -> bool:
        return bool(self._account_id and self._api_token)
    
    @property
    def supports_vision(self) -> bool:
        # Cloudflare has some vision models but not via OpenAI-compat endpoint
        return False
    
    @property
    def supports_image_generation(self) -> bool:
        # Cloudflare supports SDXL via native API
        return bool(self._image_model)
    
    @property
    def supports_speech_to_text(self) -> bool:
        # Cloudflare has Whisper
        return bool(self._stt_model)
    
    @property
    def supports_text_to_speech(self) -> bool:
        # Cloudflare doesn't have TTS yet
        return bool(self._tts_model)
    
    def _headers(self) -> dict:
        """Build auth headers. Never log the actual token."""
        return {
            "Authorization": f"Bearer {self._api_token}",
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
        Send chat completion to Cloudflare Workers AI.
        
        Uses the OpenAI-compatible /chat/completions endpoint.
        """
        url = f"{self._base_url}/chat/completions"
        model_name = model or self._chat_model
        
        payload = {
            "model": model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, json=payload, headers=self._headers())
                
                if response.status_code == 401:
                    raise ProviderError(
                        message="Invalid Cloudflare API token",
                        provider=self.name,
                        status_code=401,
                    )
                
                if response.status_code == 429:
                    raise ProviderError(
                        message="Cloudflare rate limit exceeded (free tier limit reached)",
                        provider=self.name,
                        status_code=429,
                    )
                
                if response.status_code != 200:
                    error_detail = ""
                    try:
                        error_data = response.json()
                        if "errors" in error_data:
                            error_detail = str(error_data["errors"])
                    except Exception:
                        error_detail = response.text[:200]
                    
                    logger.error(f"Cloudflare AI error {response.status_code}: {error_detail}")
                    raise ProviderError(
                        message=f"Cloudflare AI returned {response.status_code}: {error_detail}",
                        provider=self.name,
                        status_code=response.status_code,
                        raw_error=error_detail,
                    )
                
                data = response.json()
                
                # Parse OpenAI-compatible response
                content = ""
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0].get("message", {}).get("content", "")
                elif "result" in data:
                    # Cloudflare native format fallback
                    content = data["result"].get("response", "")
                
                usage = data.get("usage")
                
                return ChatResponse(
                    content=content,
                    model=model_name,
                    usage=usage,
                    raw=data,
                )
                
        except httpx.TimeoutException:
            raise ProviderError(
                message="Cloudflare AI request timed out",
                provider=self.name,
                status_code=504,
            )
        except httpx.RequestError as e:
            raise ProviderError(
                message=f"Network error connecting to Cloudflare: {str(e)}",
                provider=self.name,
                status_code=502,
            )
    
    def embed(
        self,
        texts: List[str],
        model: Optional[str] = None,
    ) -> List[List[float]]:
        """
        Generate embeddings using Cloudflare Workers AI.
        
        Note: This uses the native Cloudflare endpoint, not OpenAI-compatible.
        """
        # Cloudflare embeddings use a different endpoint structure
        model_name = model or self._embed_model
        url = f"https://api.cloudflare.com/client/v4/accounts/{self._account_id}/ai/run/{model_name}"
        
        payload = {"text": texts}
        
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, json=payload, headers=self._headers())
                
                if response.status_code != 200:
                    raise ProviderError(
                        message=f"Cloudflare embeddings returned {response.status_code}",
                        provider=self.name,
                        status_code=response.status_code,
                    )
                
                data = response.json()
                
                # Cloudflare returns {"result": {"data": [[...], [...]]}}
                if "result" in data and "data" in data["result"]:
                    return data["result"]["data"]
                
                raise ProviderError(
                    message="Unexpected embedding response format",
                    provider=self.name,
                    status_code=500,
                )
                
        except httpx.TimeoutException:
            raise ProviderError(
                message="Embedding request timed out",
                provider=self.name,
                status_code=504,
            )
        except httpx.RequestError as e:
            raise ProviderError(
                message=f"Network error: {str(e)}",
                provider=self.name,
                status_code=502,
            )
    
    def image_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
    ) -> ImageGenerationResponse:
        """
        Generate an image using Cloudflare's Stable Diffusion models.
        
        Uses the native Cloudflare /ai/run endpoint.
        Returns base64-encoded PNG image data.
        """
        model_name = model or self._image_model
        if not model_name:
            raise ProviderError(
                message="No image model configured",
                provider=self.name,
                status_code=400,
            )
        
        url = f"{self._native_url}/{model_name}"
        
        # Parse size (Cloudflare uses width/height)
        width, height = 1024, 1024
        if "x" in size:
            try:
                width, height = map(int, size.split("x"))
            except ValueError:
                pass
        
        payload = {
            "prompt": prompt,
            "width": width,
            "height": height,
        }
        
        try:
            with httpx.Client(timeout=120.0) as client:  # Image gen can take longer
                response = client.post(url, json=payload, headers=self._headers())
                
                if response.status_code == 401:
                    raise ProviderError(
                        message="Invalid Cloudflare API token",
                        provider=self.name,
                        status_code=401,
                    )
                
                if response.status_code == 429:
                    raise ProviderError(
                        message="Rate limit exceeded",
                        provider=self.name,
                        status_code=429,
                    )
                
                if response.status_code != 200:
                    raise ProviderError(
                        message=f"Image generation failed: {response.status_code}",
                        provider=self.name,
                        status_code=response.status_code,
                    )
                
                # Cloudflare returns binary image data directly
                image_bytes = response.content
                b64_data = base64.b64encode(image_bytes).decode("utf-8")
                
                return ImageGenerationResponse(
                    b64_json=b64_data,
                    model=model_name,
                    raw={"size": len(image_bytes)},
                )
                
        except httpx.TimeoutException:
            raise ProviderError(
                message="Image generation timed out",
                provider=self.name,
                status_code=504,
            )
        except httpx.RequestError as e:
            raise ProviderError(
                message=f"Network error: {str(e)}",
                provider=self.name,
                status_code=502,
            )
    
    def transcribe(
        self,
        audio_bytes: bytes,
        model: Optional[str] = None,
        language: Optional[str] = None,
    ) -> TranscriptionResponse:
        """
        Transcribe audio using Cloudflare's Whisper model.
        
        Uses the native Cloudflare /ai/run endpoint.
        Accepts various audio formats (mp3, wav, webm, etc.)
        """
        model_name = model or self._stt_model
        if not model_name:
            raise ProviderError(
                message="No speech-to-text model configured",
                provider=self.name,
                status_code=400,
            )
        
        url = f"{self._native_url}/{model_name}"
        
        # Cloudflare Whisper accepts audio as base64 or binary
        # Using binary upload via multipart form
        try:
            with httpx.Client(timeout=120.0) as client:
                # Cloudflare expects raw binary audio with appropriate content-type
                headers = {
                    "Authorization": f"Bearer {self._api_token}",
                }
                
                # Try binary upload first (simpler)
                response = client.post(
                    url,
                    content=audio_bytes,
                    headers={**headers, "Content-Type": "application/octet-stream"},
                )
                
                if response.status_code == 401:
                    raise ProviderError(
                        message="Invalid Cloudflare API token",
                        provider=self.name,
                        status_code=401,
                    )
                
                if response.status_code == 429:
                    raise ProviderError(
                        message="Rate limit exceeded",
                        provider=self.name,
                        status_code=429,
                    )
                
                if response.status_code != 200:
                    error_detail = ""
                    try:
                        error_data = response.json()
                        if "errors" in error_data:
                            error_detail = str(error_data["errors"])
                    except Exception:
                        error_detail = response.text[:200]
                    
                    raise ProviderError(
                        message=f"Transcription failed: {response.status_code} - {error_detail}",
                        provider=self.name,
                        status_code=response.status_code,
                    )
                
                data = response.json()
                
                # Cloudflare returns {"result": {"text": "...", "word_timestamps": [...]}}
                text = ""
                if "result" in data:
                    text = data["result"].get("text", "")
                
                return TranscriptionResponse(
                    text=text,
                    model=model_name,
                    raw=data.get("result"),
                )
                
        except httpx.TimeoutException:
            raise ProviderError(
                message="Transcription timed out",
                provider=self.name,
                status_code=504,
            )
        except httpx.RequestError as e:
            raise ProviderError(
                message=f"Network error: {str(e)}",
                provider=self.name,
                status_code=502,
            )

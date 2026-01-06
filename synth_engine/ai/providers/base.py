"""Base AI Provider interface using Protocol for structural typing."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union


@dataclass
class ChatMessage:
    """A single chat message."""
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class ChatResponse:
    """Response from a chat completion."""
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None  # {"prompt_tokens": ..., "completion_tokens": ...}
    raw: Optional[Any] = None  # Original response for debugging


@dataclass
class VisionResponse:
    """Response from a vision/multimodal request."""
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None
    raw: Optional[Any] = None


@dataclass
class ImageGenerationResponse:
    """Response from image generation."""
    url: Optional[str] = None  # URL to generated image
    b64_json: Optional[str] = None  # Base64-encoded image data
    model: str = ""
    raw: Optional[Any] = None


@dataclass
class TranscriptionResponse:
    """Response from speech-to-text transcription."""
    text: str
    language: Optional[str] = None  # Detected language
    duration: Optional[float] = None  # Audio duration in seconds
    model: str = ""
    raw: Optional[Any] = None


@dataclass
class SpeechResponse:
    """Response from text-to-speech generation."""
    audio_bytes: bytes  # Raw audio data
    format: str = "mp3"  # Audio format (mp3, wav, ogg)
    model: str = ""
    raw: Optional[Any] = None


class AIProvider(ABC):
    """
    Abstract base class for AI providers.
    
    Implementations:
    - DisabledProvider: Returns "not configured" for all methods
    - ServerlessGPUProvider: Generic HTTP adapter for serverless inference
    - OpenAIProvider: Direct OpenAI API
    - (Future) GeminiProvider, AnthropicProvider, etc.
    
    Security notes:
    - Never log API keys
    - Never accept keys from browser/client
    - All keys must be server-side only
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for logging/config display."""
        ...
    
    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """Whether the provider has valid credentials configured."""
        ...
    
    @property
    def supports_vision(self) -> bool:
        """Whether this provider supports vision/multimodal input."""
        return False
    
    @property
    def supports_image_generation(self) -> bool:
        """Whether this provider supports image generation."""
        return False
    
    @property
    def supports_speech_to_text(self) -> bool:
        """Whether this provider supports speech-to-text transcription."""
        return False
    
    @property
    def supports_text_to_speech(self) -> bool:
        """Whether this provider supports text-to-speech synthesis."""
        return False
    
    @abstractmethod
    def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ChatResponse:
        """
        Send a chat completion request.
        
        Args:
            messages: List of ChatMessage objects
            model: Model identifier (provider-specific), uses default if None
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens in response
            
        Returns:
            ChatResponse with generated content
            
        Raises:
            ProviderError: If the request fails
        """
        ...
    
    def vision(
        self,
        messages: List[ChatMessage],
        images: List[Union[str, bytes]],  # URLs or raw bytes
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> VisionResponse:
        """
        Send a vision/multimodal request (optional capability).
        
        Default implementation raises NotImplementedError.
        """
        raise NotImplementedError(f"{self.name} does not support vision")
    
    def image_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
    ) -> ImageGenerationResponse:
        """
        Generate an image from a text prompt (optional capability).
        
        Default implementation raises NotImplementedError.
        """
        raise NotImplementedError(f"{self.name} does not support image generation")
    
    def transcribe(
        self,
        audio_bytes: bytes,
        model: Optional[str] = None,
        language: Optional[str] = None,
    ) -> "TranscriptionResponse":
        """
        Transcribe audio to text (optional capability).
        
        Args:
            audio_bytes: Raw audio file bytes (mp3, wav, webm, etc.)
            model: Model identifier, uses default if None
            language: Optional language hint (ISO 639-1 code)
            
        Returns:
            TranscriptionResponse with transcribed text
            
        Raises:
            NotImplementedError: If provider doesn't support STT
            ProviderError: If the request fails
        """
        raise NotImplementedError(f"{self.name} does not support speech-to-text")
    
    def speak(
        self,
        text: str,
        model: Optional[str] = None,
        voice: str = "alloy",
        speed: float = 1.0,
        format: str = "mp3",
    ) -> "SpeechResponse":
        """
        Convert text to speech (optional capability).
        
        Args:
            text: Text to synthesize
            model: Model identifier, uses default if None
            voice: Voice name/ID (provider-specific)
            speed: Speech speed multiplier (0.5-2.0)
            format: Output format (mp3, wav, ogg)
            
        Returns:
            SpeechResponse with audio bytes
            
        Raises:
            NotImplementedError: If provider doesn't support TTS
            ProviderError: If the request fails
        """
        raise NotImplementedError(f"{self.name} does not support text-to-speech")


class ProviderError(Exception):
    """Error from an AI provider."""
    
    def __init__(
        self,
        message: str,
        provider: str,
        status_code: Optional[int] = None,
        raw_error: Optional[Any] = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        self.raw_error = raw_error

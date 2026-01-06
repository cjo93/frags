"""
AI endpoint abuse controls: input limits, rate limiting, concurrency guards.

This module provides defense-in-depth protection for AI endpoints:
- Input size limits (413 Payload Too Large)
- Rate limiting via token bucket (429 Too Many Requests)
- Concurrency limiting (429 Too Many Concurrent Requests)
- Request ID tracking for observability
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from functools import wraps
from time import monotonic
from typing import Callable, Dict, Optional, Set, Tuple, Any

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from synth_engine.api.deps import DEV_ADMIN_USER_ID


# Set up structured logger for abuse events
abuse_logger = logging.getLogger("synth.abuse")
abuse_logger.setLevel(logging.INFO)


# =============================================================================
# Configuration - Input Limits
# =============================================================================

@dataclass
class InputLimits:
    """Input limits for a specific endpoint."""
    max_request_bytes: int = 64 * 1024  # 64KB default
    max_items: Optional[int] = None  # For list inputs (messages, texts)
    max_chars_per_item: Optional[int] = None
    max_total_chars: Optional[int] = None


# Per-endpoint input limits
INPUT_LIMITS: Dict[str, InputLimits] = {
    "/ai/chat": InputLimits(
        max_request_bytes=64 * 1024,  # 64KB
        max_items=30,  # max 30 messages
        max_chars_per_item=8000,  # 8k chars per message
        max_total_chars=40000,  # 40k total chars
    ),
    "/ai/embed": InputLimits(
        max_request_bytes=512 * 1024,  # 512KB (many texts)
        max_items=256,  # max 256 inputs
        max_chars_per_item=2000,  # 2k chars per input
        max_total_chars=50000,  # 50k total chars
    ),
    "/ai/image": InputLimits(
        max_request_bytes=16 * 1024,  # 16KB (just prompt)
        max_chars_per_item=4000,  # max 4k prompt
    ),
    "/ai/transcribe": InputLimits(
        max_request_bytes=25 * 1024 * 1024,  # 25MB audio
    ),
    "/ai/speak": InputLimits(
        max_request_bytes=16 * 1024,  # 16KB (text + params)
        max_chars_per_item=4096,  # max 4k text
    ),
}


# =============================================================================
# Configuration - Rate Limits
# =============================================================================

@dataclass
class RateLimitConfig:
    """Rate limit config: token bucket parameters."""
    capacity: int  # Max burst
    refill_per_sec: float  # Tokens per second


# Per-endpoint rate limits (per user)
RATE_LIMITS: Dict[str, RateLimitConfig] = {
    "/ai/chat": RateLimitConfig(capacity=20, refill_per_sec=20/60),  # 20/min
    "/ai/embed": RateLimitConfig(capacity=60, refill_per_sec=60/60),  # 60/min
    "/ai/image": RateLimitConfig(capacity=10, refill_per_sec=10/60),  # 10/min
    "/ai/transcribe": RateLimitConfig(capacity=10, refill_per_sec=10/60),  # 10/min
    "/ai/speak": RateLimitConfig(capacity=10, refill_per_sec=10/60),  # 10/min
}

# Global IP rate limit (across all AI endpoints)
GLOBAL_IP_RATE_LIMIT = RateLimitConfig(capacity=120, refill_per_sec=120/60)  # 120/min


# =============================================================================
# Configuration - Concurrency Limits
# =============================================================================

CONCURRENCY_LIMITS: Dict[str, int] = {
    "/ai/chat": 2,  # max 2 concurrent chat requests
    "/ai/embed": 5,  # max 5 concurrent embed requests
    "/ai/image": 2,  # max 2 concurrent image requests
    "/ai/transcribe": 2,  # max 2 concurrent transcribe requests
    "/ai/speak": 2,  # max 2 concurrent speak requests
}


# =============================================================================
# Token Bucket Rate Limiter
# =============================================================================

@dataclass
class Bucket:
    capacity: float
    refill_per_sec: float
    tokens: float
    last: float


class TokenBucketLimiter:
    """In-memory token bucket rate limiter."""
    
    def __init__(self) -> None:
        self._buckets: Dict[Tuple[str, str], Bucket] = {}
        self._lock = asyncio.Lock()
    
    async def allow(
        self, 
        key: str, 
        endpoint: str, 
        config: RateLimitConfig,
        cost: float = 1.0
    ) -> Tuple[bool, float]:
        """
        Check if request is allowed.
        
        Returns:
            (allowed, retry_after_seconds)
        """
        async with self._lock:
            bucket_key = (key, endpoint)
            now = monotonic()
            
            bucket = self._buckets.get(bucket_key)
            if bucket is None:
                bucket = Bucket(
                    capacity=float(config.capacity),
                    refill_per_sec=config.refill_per_sec,
                    tokens=float(config.capacity),
                    last=now,
                )
                self._buckets[bucket_key] = bucket
            
            # Refill tokens
            elapsed = max(0.0, now - bucket.last)
            bucket.last = now
            bucket.tokens = min(bucket.capacity, bucket.tokens + elapsed * bucket.refill_per_sec)
            
            if bucket.tokens >= cost:
                bucket.tokens -= cost
                return True, 0.0
            
            # Calculate retry-after
            tokens_needed = cost - bucket.tokens
            retry_after = tokens_needed / bucket.refill_per_sec if bucket.refill_per_sec > 0 else 60
            return False, retry_after
    
    def cleanup_old_buckets(self, max_age_secs: float = 3600) -> int:
        """Remove buckets older than max_age_secs. Call periodically."""
        now = monotonic()
        to_delete = [
            k for k, b in self._buckets.items()
            if now - b.last > max_age_secs
        ]
        for k in to_delete:
            del self._buckets[k]
        return len(to_delete)


# Global rate limiter instance
_rate_limiter = TokenBucketLimiter()


# =============================================================================
# Concurrency Limiter
# =============================================================================

class ConcurrencyLimiter:
    """Track concurrent requests per user per endpoint."""
    
    def __init__(self) -> None:
        self._counts: Dict[Tuple[str, str], int] = defaultdict(int)
        self._lock = asyncio.Lock()
    
    async def acquire(self, user_id: str, endpoint: str, limit: int) -> bool:
        """Try to acquire a slot. Returns False if limit exceeded."""
        async with self._lock:
            key = (user_id, endpoint)
            if self._counts[key] >= limit:
                return False
            self._counts[key] += 1
            return True
    
    async def release(self, user_id: str, endpoint: str) -> None:
        """Release a slot."""
        async with self._lock:
            key = (user_id, endpoint)
            self._counts[key] = max(0, self._counts[key] - 1)
    
    def get_count(self, user_id: str, endpoint: str) -> int:
        """Get current count (for metrics)."""
        return self._counts.get((user_id, endpoint), 0)


# Global concurrency limiter instance
_concurrency_limiter = ConcurrencyLimiter()


# =============================================================================
# Request ID Middleware
# =============================================================================

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add X-Request-Id header to all requests for tracing."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get or generate request ID
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        
        # Store in request state for access in handlers
        request.state.request_id = request_id
        
        # Call handler
        response = await call_next(request)
        
        # Add to response headers
        response.headers["X-Request-Id"] = request_id
        return response


# =============================================================================
# Abuse Control Middleware
# =============================================================================

def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting X-Forwarded-For."""
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        # First IP in the chain is the original client
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_user_id_from_auth(request: Request) -> Optional[str]:
    """Extract user_id from Authorization header (without full validation)."""
    from synth_engine.api.auth import decode_token
    from synth_engine.config import settings
    import secrets
    
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    
    token = auth.split(" ", 1)[1]
    
    # Check dev admin token
    if settings.dev_admin_enabled and settings.dev_admin_token:
        if len(settings.dev_admin_token) >= 32 and token != "DEV_ADMIN":
            if secrets.compare_digest(token, settings.dev_admin_token):
                return DEV_ADMIN_USER_ID
    
    # Try to decode JWT
    try:
        return decode_token(token)
    except Exception:
        return None


class AbuseControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware for AI endpoint abuse controls.
    
    Applies:
    - Request size limits (413)
    - Rate limiting (429)
    - Concurrency limiting (429)
    
    DEV_ADMIN bypasses rate/concurrency limits but not input limits.
    """
    
    AI_PATH_PREFIX = "/ai/"
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only apply to AI endpoints
        path = request.url.path
        if not path.startswith(self.AI_PATH_PREFIX):
            return await call_next(request)
        
        # Normalize path (remove trailing slash)
        endpoint = path.rstrip("/")
        
        # Get request ID for logging
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Get user ID and IP for rate limiting
        user_id = _get_user_id_from_auth(request)
        client_ip = _get_client_ip(request)
        rate_limit_key = user_id or f"ip:{client_ip}"
        
        # Check if DEV_ADMIN (bypasses rate/concurrency but not input limits)
        is_dev_admin = user_id == DEV_ADMIN_USER_ID
        
        # =========================================================
        # Check 1: Input size limits (before reading body)
        # =========================================================
        content_length = request.headers.get("Content-Length")
        if content_length:
            try:
                size = int(content_length)
                limits = INPUT_LIMITS.get(endpoint, InputLimits())
                if size > limits.max_request_bytes:
                    _metrics.record_blocked_size()
                    abuse_logger.warning(
                        f"BLOCKED_SIZE | request_id={request_id} | endpoint={endpoint} | "
                        f"ip={client_ip} | user={user_id or 'anonymous'} | "
                        f"size={size} | max={limits.max_request_bytes}"
                    )
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": "Payload too large",
                            "max_bytes": limits.max_request_bytes,
                            "received_bytes": size,
                        },
                        headers={"X-Request-Id": request_id},
                    )
            except ValueError:
                pass
        
        # =========================================================
        # Check 2: Global IP rate limit
        # =========================================================
        if not is_dev_admin:
            allowed, retry_after = await _rate_limiter.allow(
                f"ip:{client_ip}",
                "__global__",
                GLOBAL_IP_RATE_LIMIT,
            )
            if not allowed:
                _metrics.record_blocked_rate_limit()
                abuse_logger.warning(
                    f"BLOCKED_RATE_LIMIT | request_id={request_id} | endpoint={endpoint} | "
                    f"ip={client_ip} | user={user_id or 'anonymous'} | type=global_ip | "
                    f"retry_after={int(retry_after) + 1}"
                )
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded (global)"},
                    headers={
                        "X-Request-Id": request_id,
                        "Retry-After": str(int(retry_after) + 1),
                    },
                )
        
        # =========================================================
        # Check 3: Per-endpoint rate limit
        # =========================================================
        rate_config = RATE_LIMITS.get(endpoint)
        if rate_config and not is_dev_admin:
            allowed, retry_after = await _rate_limiter.allow(
                rate_limit_key,
                endpoint,
                rate_config,
            )
            if not allowed:
                _metrics.record_blocked_rate_limit()
                abuse_logger.warning(
                    f"BLOCKED_RATE_LIMIT | request_id={request_id} | endpoint={endpoint} | "
                    f"ip={client_ip} | user={user_id or 'anonymous'} | type=per_endpoint | "
                    f"retry_after={int(retry_after) + 1}"
                )
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded"},
                    headers={
                        "X-Request-Id": request_id,
                        "Retry-After": str(int(retry_after) + 1),
                    },
                )
        
        # =========================================================
        # Check 4: Concurrency limit
        # =========================================================
        concurrency_limit = CONCURRENCY_LIMITS.get(endpoint)
        acquired = False
        if concurrency_limit and user_id and not is_dev_admin:
            acquired = await _concurrency_limiter.acquire(user_id, endpoint, concurrency_limit)
            if not acquired:
                _metrics.record_blocked_concurrency()
                abuse_logger.warning(
                    f"BLOCKED_CONCURRENCY | request_id={request_id} | endpoint={endpoint} | "
                    f"ip={client_ip} | user={user_id} | limit={concurrency_limit}"
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many concurrent requests",
                        "limit": concurrency_limit,
                    },
                    headers={"X-Request-Id": request_id},
                )
        
        # Record successful request (not blocked)
        _metrics.record_request(endpoint)
        
        # =========================================================
        # Process request
        # =========================================================
        start_time = monotonic()
        try:
            response = await call_next(request)
            duration_ms = int((monotonic() - start_time) * 1000)
            abuse_logger.info(
                f"AI_REQUEST | request_id={request_id} | endpoint={endpoint} | "
                f"ip={client_ip} | user={user_id or 'anonymous'} | "
                f"status={response.status_code} | duration_ms={duration_ms}"
            )
            return response
        finally:
            # Release concurrency slot
            if acquired and user_id:
                await _concurrency_limiter.release(user_id, endpoint)


# =============================================================================
# Input Validation Helpers (for use in route handlers)
# =============================================================================

def validate_chat_input(messages: list, endpoint: str = "/ai/chat") -> None:
    """Validate chat messages against input limits. Raises HTTPException on violation."""
    limits = INPUT_LIMITS.get(endpoint, InputLimits())
    
    if limits.max_items and len(messages) > limits.max_items:
        raise HTTPException(
            413,
            f"Too many messages: {len(messages)} exceeds limit of {limits.max_items}",
        )
    
    total_chars = 0
    for i, msg in enumerate(messages):
        content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
        char_count = len(content) if content else 0
        total_chars += char_count
        
        if limits.max_chars_per_item and char_count > limits.max_chars_per_item:
            raise HTTPException(
                413,
                f"Message {i} too long: {char_count} chars exceeds limit of {limits.max_chars_per_item}",
            )
    
    if limits.max_total_chars and total_chars > limits.max_total_chars:
        raise HTTPException(
            413,
            f"Total message content too large: {total_chars} chars exceeds limit of {limits.max_total_chars}",
        )


def validate_embed_input(texts: list, endpoint: str = "/ai/embed") -> None:
    """Validate embed texts against input limits. Raises HTTPException on violation."""
    limits = INPUT_LIMITS.get(endpoint, InputLimits())
    
    if limits.max_items and len(texts) > limits.max_items:
        raise HTTPException(
            413,
            f"Too many texts: {len(texts)} exceeds limit of {limits.max_items}",
        )
    
    total_chars = 0
    for i, text in enumerate(texts):
        char_count = len(text) if text else 0
        total_chars += char_count
        
        if limits.max_chars_per_item and char_count > limits.max_chars_per_item:
            raise HTTPException(
                413,
                f"Text {i} too long: {char_count} chars exceeds limit of {limits.max_chars_per_item}",
            )
    
    if limits.max_total_chars and total_chars > limits.max_total_chars:
        raise HTTPException(
            413,
            f"Total text too large: {total_chars} chars exceeds limit of {limits.max_total_chars}",
        )


# =============================================================================
# Metrics (in-memory counters for admin endpoint)
# =============================================================================

@dataclass
class AbuseMetrics:
    """Metrics for abuse controls."""
    requests_total: int = 0
    requests_blocked_rate_limit: int = 0
    requests_blocked_concurrency: int = 0
    requests_blocked_size: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=dict)
    
    def record_request(self, endpoint: str) -> None:
        self.requests_total += 1
        self.requests_by_endpoint[endpoint] = self.requests_by_endpoint.get(endpoint, 0) + 1
    
    def record_blocked_rate_limit(self) -> None:
        self.requests_blocked_rate_limit += 1
    
    def record_blocked_concurrency(self) -> None:
        self.requests_blocked_concurrency += 1
    
    def record_blocked_size(self) -> None:
        self.requests_blocked_size += 1
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "requests_total": self.requests_total,
            "requests_blocked_rate_limit": self.requests_blocked_rate_limit,
            "requests_blocked_concurrency": self.requests_blocked_concurrency,
            "requests_blocked_size": self.requests_blocked_size,
            "requests_by_endpoint": dict(self.requests_by_endpoint),
        }


# Global metrics instance
_metrics = AbuseMetrics()


def get_abuse_metrics() -> Dict[str, Any]:
    """Get current abuse metrics."""
    return _metrics.to_dict()


def reset_abuse_metrics() -> None:
    """Reset abuse metrics (for testing)."""
    global _metrics
    _metrics = AbuseMetrics()

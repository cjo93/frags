"""Cloudflare Turnstile verification for bot protection."""
from __future__ import annotations

import logging
from typing import Optional
import httpx

from synth_engine.config import settings

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def is_turnstile_enabled() -> bool:
    """Check if Turnstile verification is enabled and configured."""
    return bool(settings.turnstile_enabled and settings.turnstile_secret_key)


async def verify_turnstile_token(
    token: str,
    remote_ip: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """
    Verify a Turnstile token with Cloudflare.
    
    Args:
        token: The cf-turnstile-response token from the client
        remote_ip: Optional client IP for additional validation
        
    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    if not is_turnstile_enabled():
        # If Turnstile is disabled, allow all requests
        return True, None
    
    if not token:
        return False, "Turnstile verification required"
    
    payload = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    
    if remote_ip:
        payload["remoteip"] = remote_ip
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            
            if response.status_code != 200:
                logger.error(f"Turnstile API returned {response.status_code}")
                # Fail open on API errors to avoid blocking legitimate users
                return True, None
            
            data = response.json()
            
            success = data.get("success", False)
            
            if not success:
                error_codes = data.get("error-codes", [])
                logger.warning(f"Turnstile verification failed: {error_codes}")
                
                # Map error codes to user-friendly messages
                if "invalid-input-response" in error_codes:
                    return False, "Bot protection check failed. Please try again."
                if "timeout-or-duplicate" in error_codes:
                    return False, "Verification expired. Please refresh and try again."
                
                return False, "Verification failed. Please try again."
            
            return True, None
            
    except httpx.TimeoutException:
        logger.error("Turnstile API timeout")
        # Fail open on timeout
        return True, None
    except Exception as e:
        logger.error(f"Turnstile verification error: {e}")
        # Fail open on unexpected errors
        return True, None


def verify_turnstile_token_sync(
    token: str,
    remote_ip: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """
    Synchronous version of verify_turnstile_token.
    
    Use this for sync endpoints (non-async def).
    """
    if not is_turnstile_enabled():
        return True, None
    
    if not token:
        return False, "Turnstile verification required"
    
    payload = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    
    if remote_ip:
        payload["remoteip"] = remote_ip
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(TURNSTILE_VERIFY_URL, data=payload)
            
            if response.status_code != 200:
                logger.error(f"Turnstile API returned {response.status_code}")
                return True, None
            
            data = response.json()
            success = data.get("success", False)
            
            if not success:
                error_codes = data.get("error-codes", [])
                logger.warning(f"Turnstile verification failed: {error_codes}")
                
                if "invalid-input-response" in error_codes:
                    return False, "Bot protection check failed. Please try again."
                if "timeout-or-duplicate" in error_codes:
                    return False, "Verification expired. Please refresh and try again."
                
                return False, "Verification failed. Please try again."
            
            return True, None
            
    except httpx.TimeoutException:
        logger.error("Turnstile API timeout")
        return True, None
    except Exception as e:
        logger.error(f"Turnstile verification error: {e}")
        return True, None

from __future__ import annotations

from typing import Any, Dict

import httpx
from jose import jwt
from fastapi import HTTPException

GOOGLE_ISS = "https://accounts.google.com"
GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
APPLE_ISS = "https://appleid.apple.com"
APPLE_JWKS = "https://appleid.apple.com/auth/keys"


async def verify_google_id_token(id_token: str, client_id: str) -> Dict[str, Any]:
    if not client_id:
        raise HTTPException(500, "Google OAuth not configured")
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(GOOGLE_TOKENINFO, params={"id_token": id_token})
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid Google token")
    data = resp.json()
    if data.get("aud") != client_id:
        raise HTTPException(401, "Google token audience mismatch")
    if data.get("iss") not in (GOOGLE_ISS, "accounts.google.com"):
        raise HTTPException(401, "Google token issuer mismatch")
    return data


async def verify_apple_id_token(id_token: str, client_id: str) -> Dict[str, Any]:
    if not client_id:
        raise HTTPException(500, "Apple OAuth not configured")
    header = jwt.get_unverified_header(id_token)
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(APPLE_JWKS)
    if resp.status_code != 200:
        raise HTTPException(401, "Apple keys unavailable")
    keys = resp.json().get("keys", [])
    key = next((k for k in keys if k.get("kid") == header.get("kid")), None)
    if not key:
        raise HTTPException(401, "Apple key not found")
    try:
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=APPLE_ISS,
        )
    except Exception:
        raise HTTPException(401, "Invalid Apple token")
    return claims

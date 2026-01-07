from __future__ import annotations
import hashlib
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from synth_engine.config import settings

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash(p: str) -> str:
    """Pre-hash password with SHA256 to avoid bcrypt's 72-byte limit."""
    return hashlib.sha256(p.encode("utf-8")).hexdigest()


def hash_password(p: str) -> str:
    return pwd.hash(_prehash(p))


def verify_password(p: str, h: str) -> bool:
    return pwd.verify(_prehash(p), h)

def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_exp_minutes)
    return jwt.encode({"sub": user_id, "exp": exp}, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> str:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return payload["sub"]

def create_agent_token(user_id: str, scopes: list[str], mem: bool = True, tools: bool = True) -> dict:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.agent_jwt_exp_minutes)
    secret = settings.agent_jwt_secret or settings.jwt_secret
    payload = {
        "sub": user_id,
        "aud": settings.agent_jwt_audience,
        "iss": settings.agent_jwt_issuer,
        "scope": scopes,
        "mem": mem,
        "tools": tools,
        "exp": exp,
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {"agent_token": token, "expires_at": exp.isoformat()}

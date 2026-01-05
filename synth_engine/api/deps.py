from __future__ import annotations
from fastapi import Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from synth_engine.storage.db import SessionLocal
from synth_engine.storage.models import User
from synth_engine.api.auth import decode_token
from synth_engine.config import settings


def db() -> Session:
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def me_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    return decode_token(authorization.split(" ", 1)[1])


class DevAdminUser:
    """Fake user object for dev admin bypass."""
    def __init__(self, email: str):
        self.id = "dev-admin-00000000-0000-0000-0000-000000000000"
        self.email = email
        self.role = "admin"
        self.is_dev_admin = True


def get_current_user(authorization: str = Header(...), s: Session = Depends(db)) -> User:
    """Returns the full User object for the authenticated user."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    
    token = authorization.split(" ", 1)[1]
    
    # Dev admin bypass - only if enabled and token matches
    if settings.dev_admin_enabled and token == "DEV_ADMIN" and settings.dev_admin_email:
        return DevAdminUser(settings.dev_admin_email)
    
    user_id = decode_token(token)
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(*roles):
    """Dependency factory that requires user to have one of the specified roles."""
    def _dep(user: User = Depends(get_current_user)):
        if user.role.value not in roles and user.role not in roles:
            raise HTTPException(403, "Forbidden: insufficient role")
        return user
    return _dep

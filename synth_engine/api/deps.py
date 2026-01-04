from __future__ import annotations
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from synth_engine.storage.db import SessionLocal
from synth_engine.storage.models import User
from synth_engine.api.auth import decode_token


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


def get_current_user(authorization: str = Header(...), s: Session = Depends(db)) -> User:
    """Returns the full User object for the authenticated user."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    user_id = decode_token(authorization.split(" ", 1)[1])
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

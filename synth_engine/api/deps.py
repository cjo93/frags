from __future__ import annotations
import logging
from datetime import datetime
from typing import Optional
from fastapi import Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from synth_engine.storage.db import SessionLocal
from synth_engine.storage.models import User, UserRole
from synth_engine.api.auth import decode_token
from synth_engine.config import settings

# Structured logger for audit trail
audit_logger = logging.getLogger("synth.audit")
audit_logger.setLevel(logging.INFO)

# Ensure we have at least a stream handler
if not audit_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        '%(asctime)s [AUDIT] %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S'
    ))
    audit_logger.addHandler(handler)


# Dev admin user ID constant
DEV_ADMIN_USER_ID = "dev-admin-00000000-0000-0000-0000-000000000000"


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
    """
    Dev admin wrapper that grants admin role to a specific authenticated user.
    """
    def __init__(self, user: User):
        self.id = user.id
        self.email = user.email
        self.role = UserRole.admin  # Use actual enum so .value works
        self.created_at = user.created_at
        self.is_dev_admin = True  # Flag to identify dev admin status
        
    def __repr__(self):
        return f"<DevAdminUser email={self.email} user_id={self.id}>"


def _dev_admin_active() -> bool:
    if not settings.dev_admin_enabled:
        return False
    if not settings.dev_admin_email:
        audit_logger.warning("DEV_ADMIN: Attempted access but email not configured")
        return False
    if settings.dev_admin_expires_at:
        try:
            from datetime import datetime, timezone
            expires_str = settings.dev_admin_expires_at.replace('Z', '+00:00')
            expires_at = datetime.fromisoformat(expires_str)
            if datetime.now(timezone.utc) > expires_at:
                audit_logger.warning(
                    f"DEV_ADMIN: Access denied - token expired at {settings.dev_admin_expires_at}"
                )
                return False
        except ValueError as e:
            audit_logger.warning(f"DEV_ADMIN: Invalid expires_at format: {e}")
            return False
    return True


def _is_dev_admin_email(email: str) -> bool:
    return _dev_admin_active() and email == settings.dev_admin_email


def is_dev_admin_user(user) -> bool:
    """Check if user is a dev admin (for type-safe checks)."""
    return getattr(user, 'is_dev_admin', False)


def get_current_user(
    request: Request,
    authorization: str = Header(...),
    s: Session = Depends(db)
) -> User:
    """
    Returns the full User object for the authenticated user.
    
    Supports dev admin elevation when properly configured:
    - SYNTH_DEV_ADMIN_ENABLED=true
    - SYNTH_DEV_ADMIN_EMAIL=<email> (must match authenticated user)
    - Authorization: Bearer <token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    
    token = authorization.split(" ", 1)[1]
    
    # Normal JWT auth flow
    try:
        user_id = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
    if _is_dev_admin_email(user.email or ""):
        dev_user = DevAdminUser(user)
        audit_logger.info(
            f"DEV_ADMIN: Access granted | "
            f"path={request.url.path} | "
            f"method={request.method} | "
            f"email={user.email} | "
            f"user_id={user.id}"
        )
        return dev_user
    return user


def require_role(*roles):
    """Dependency factory that requires user to have one of the specified roles."""
    def _dep(user=Depends(get_current_user)):
        if user.role.value not in roles and user.role not in roles:
            raise HTTPException(403, "Forbidden: insufficient role")
        return user
    return _dep


def require_admin_mutations():
    """
    Dependency that requires admin mutations to be enabled.
    Use for sensitive operations like impersonation, manual plan overrides.
    """
    def _dep(user=Depends(require_role("admin"))):
        if not settings.admin_mutations_enabled:
            raise HTTPException(
                403, 
                "Admin mutations disabled. Set SYNTH_ADMIN_MUTATIONS_ENABLED=true to enable."
            )
        return user
    return _dep

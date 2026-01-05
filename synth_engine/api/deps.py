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
    Fake user object for dev admin bypass - mimics User model attributes.
    
    Security:
    - Only instantiated when SYNTH_DEV_ADMIN_ENABLED=true AND
      Bearer token matches SYNTH_DEV_ADMIN_TOKEN (32+ char secret)
    - All actions are logged to audit trail
    """
    def __init__(self, email: str):
        self.id = DEV_ADMIN_USER_ID
        self.email = email
        self.role = UserRole.admin  # Use actual enum so .value works
        self.created_at = datetime.utcnow()  # Fake creation time
        self.is_dev_admin = True  # Flag to identify dev admin bypass
        
    def __repr__(self):
        return f"<DevAdminUser email={self.email}>"


def _validate_dev_admin_token(token: str) -> bool:
    """
    Validate dev admin token with security checks.
    
    Requirements:
    1. SYNTH_DEV_ADMIN_ENABLED must be true
    2. SYNTH_DEV_ADMIN_TOKEN must be set (32+ chars)
    3. SYNTH_DEV_ADMIN_EMAIL must be set
    4. Token must match exactly
    """
    if not settings.dev_admin_enabled:
        return False
    
    if not settings.dev_admin_token or len(settings.dev_admin_token) < 32:
        # Token not set or too short - security risk, reject
        audit_logger.warning("DEV_ADMIN: Attempted access but token not configured or too short")
        return False
    
    if not settings.dev_admin_email:
        audit_logger.warning("DEV_ADMIN: Attempted access but email not configured")
        return False
    
    # Reject the old insecure "DEV_ADMIN" string
    if token == "DEV_ADMIN":
        audit_logger.warning("DEV_ADMIN: Rejected insecure 'DEV_ADMIN' token - use proper secret")
        return False
    
    # Constant-time comparison to prevent timing attacks
    import secrets
    return secrets.compare_digest(token, settings.dev_admin_token)


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
    
    Supports dev admin bypass when properly configured:
    - SYNTH_DEV_ADMIN_ENABLED=true
    - SYNTH_DEV_ADMIN_TOKEN=<32+ char secret>
    - SYNTH_DEV_ADMIN_EMAIL=<email>
    - Authorization: Bearer <token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    
    token = authorization.split(" ", 1)[1]
    
    # Dev admin bypass - only if properly secured
    if _validate_dev_admin_token(token):
        dev_user = DevAdminUser(settings.dev_admin_email)
        # Audit log every dev admin access
        audit_logger.info(
            f"DEV_ADMIN: Access granted | "
            f"path={request.url.path} | "
            f"method={request.method} | "
            f"email={settings.dev_admin_email}"
        )
        return dev_user
    
    # Normal JWT auth flow
    try:
        user_id = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
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

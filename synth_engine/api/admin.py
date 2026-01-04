"""Admin endpoints (role-gated)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, require_role
from synth_engine.storage import repo as R
from synth_engine.storage.models import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(
    limit: int = 50,
    offset: int = 0,
    _user: User = Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """List all users (admin only)."""
    users, total = R.list_users_paginated(s, limit=limit, offset=offset)
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role.value,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/users/{user_id}")
def get_user(
    user_id: str,
    _user: User = Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """Get a single user's details (admin only)."""
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    billing = R.get_billing_status(s, user_id)
    usage = R.get_usage_summary(s, user_id, days=30)
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "billing": billing,
        "usage_30d": usage,
    }


@router.post("/users/{user_id}/role")
def set_role(
    user_id: str,
    role: str,
    _user: User = Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """Set a user's role (admin only)."""
    if role not in [r.value for r in UserRole]:
        raise HTTPException(400, f"Invalid role: {role}. Valid roles: {[r.value for r in UserRole]}")
    
    updated = R.set_user_role(s, user_id, role)
    if not updated:
        raise HTTPException(404, "User not found")
    
    return {"id": updated.id, "email": updated.email, "role": updated.role.value}


@router.get("/usage/{user_id}")
def get_user_usage(
    user_id: str,
    days: int = 30,
    _user: User = Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """Get usage summary for a specific user (admin only)."""
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    return {
        "user_id": user_id,
        "email": user.email,
        "days": days,
        "usage": R.get_usage_summary(s, user_id, days=days),
    }


@router.get("/stats")
def admin_stats(
    _user: User = Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """Get high-level platform stats (admin only)."""
    from synth_engine.storage.models import Profile, StripeSubscription
    
    total_users = s.query(User).count()
    total_profiles = s.query(Profile).count()
    active_subs = s.query(StripeSubscription).filter(StripeSubscription.status.in_(("active", "trialing"))).count()
    
    return {
        "total_users": total_users,
        "total_profiles": total_profiles,
        "active_subscriptions": active_subs,
    }

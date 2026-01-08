"""Admin endpoints (role-gated)."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, require_role, require_admin_mutations, audit_logger, is_dev_admin_user
from synth_engine.api.auth import create_token
from synth_engine.storage import repo as R
from synth_engine.storage.models import User, UserRole, StripeCustomer, StripeSubscription
from synth_engine.config import settings
from synth_engine.api.abuse import get_abuse_metrics, reset_abuse_metrics
from synth_engine.utils.diag import secret_fingerprint

router = APIRouter(prefix="/admin", tags=["admin"])


# ----- Read-only endpoints (admin role required) -----

@router.get("/users")
def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """List all users (admin only)."""
    users, total = R.list_users_paginated(s, limit=limit, offset=offset)
    
    # Get stripe customer IDs for all users
    user_ids = [u.id for u in users]
    customers = s.query(StripeCustomer).filter(StripeCustomer.user_id.in_(user_ids)).all()
    customer_map = {c.user_id: c.stripe_customer_id for c in customers}
    
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role.value,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "plan": R.plan_for_user(s, u.id),
                "stripe_customer_id": customer_map.get(u.id),
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
    _user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """Get a single user's details (admin only)."""
    user = s.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    billing = R.get_billing_status(s, user_id)
    usage = R.get_usage_summary(s, user_id, days=30)
    customer = s.query(StripeCustomer).filter(StripeCustomer.user_id == user_id).first()
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "billing": billing,
        "usage_30d": usage,
        "stripe_customer_id": customer.stripe_customer_id if customer else None,
    }


@router.get("/usage/{user_id}")
def get_user_usage(
    user_id: str,
    days: int = 30,
    _user=Depends(require_role("admin")),
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
    _user=Depends(require_role("admin")),
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


@router.get("/ai/config")
def ai_config_status(
    _user=Depends(require_role("admin")),
):
    """
    Get AI configuration status (admin only).
    Does NOT expose the actual API key.
    """
    from synth_engine.ai.providers import get_ai_provider
    provider = get_ai_provider(settings)
    
    return {
        "ai_provider": provider.name,
        "ai_configured": provider.is_configured,
        "supports_chat": provider.is_configured,
        "supports_vision": provider.supports_vision,
        "supports_image": provider.supports_image_generation,
        "image_enabled": settings.ai_image_enabled,
        # Legacy fields for backwards compat
        "openai_configured": bool(settings.openai_api_key),
        "openai_model": settings.openai_model,
        "openai_key_prefix": settings.openai_api_key[:8] + "..." if settings.openai_api_key else None,
    }


@router.get("/config")
def admin_config_status(
    _user=Depends(require_role("admin")),
):
    """
    Get overall admin configuration status (admin only).
    Does NOT expose secrets.
    """
    from synth_engine.ai.providers import get_ai_provider
    provider = get_ai_provider(settings)
    
    return {
        "dev_admin_enabled": settings.dev_admin_enabled,
        "dev_admin_email": settings.dev_admin_email if settings.dev_admin_enabled else None,
        "dev_admin_expires_at": settings.dev_admin_expires_at if settings.dev_admin_enabled else None,
        "admin_mutations_enabled": settings.admin_mutations_enabled,
        "stripe_configured": bool(settings.stripe_secret_key),
        "stripe_webhook_configured": bool(settings.stripe_webhook_secret),
        # AI provider info
        "ai_provider": provider.name,
        "ai_configured": provider.is_configured,
        "image_enabled": settings.ai_image_enabled and provider.supports_image_generation,
        # Legacy field
        "openai_configured": bool(settings.openai_api_key),
        "app_base_url": settings.app_base_url,
        "api_base_url": settings.api_base_url,
    }


@router.get("/diag/hmac-fingerprint")
def hmac_fingerprint(
    _user=Depends(require_role("admin")),
):
    fp = secret_fingerprint(settings.backend_hmac_secret)
    return {
        "configured": bool(fp),
        "fingerprint": fp
    }

class BetaAccessRequest(BaseModel):
    email: str
    plan_key: str = "beta"


class BetaInviteRequest(BaseModel):
    email: str
    ttl_hours: int | None = 168


@router.post("/beta/grant")
def grant_beta_access(
    req: BetaAccessRequest,
    _user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    if not is_dev_admin_user(_user):
        raise HTTPException(403, "Dev admin only")
    plan_key = (req.plan_key or "beta").strip().lower()
    if plan_key not in ("beta", "pro"):
        raise HTTPException(400, "Invalid plan_key")

    user = s.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(404, "User not found")

    if plan_key == "beta":
        user.tier = "beta"
        s.commit()
        return {"ok": True, "user_id": user.id, "plan_key": plan_key}

    stripe_customer_id = R.get_stripe_customer_id(s, user.id) or f"beta_{user.id}"
    if not R.get_stripe_customer_id(s, user.id):
        R.ensure_stripe_customer(s, user.id, user.email, stripe_customer_id)

    sub_id = f"beta_{user.id}"
    sub = s.query(StripeSubscription).filter(StripeSubscription.stripe_subscription_id == sub_id).first()
    if sub:
        sub.status = "active"
        sub.price_id = plan_key
        sub.current_period_end = None
        sub.cancel_at_period_end = False
        sub.updated_at = datetime.utcnow()
    else:
        sub = StripeSubscription(
            id=R.new_id(),
            user_id=user.id,
            stripe_subscription_id=sub_id,
            status="active",
            price_id=plan_key,
            current_period_end=None,
            cancel_at_period_end=False,
        )
        s.add(sub)
    s.commit()

    return {"ok": True, "user_id": user.id, "plan_key": plan_key}


@router.post("/beta/revoke")
def revoke_beta_access(
    req: BetaAccessRequest,
    _user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    if not is_dev_admin_user(_user):
        raise HTTPException(403, "Dev admin only")
    user = s.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(404, "User not found")

    if user.tier == "beta":
        user.tier = "standard"
        s.commit()

    sub_id = f"beta_{user.id}"
    sub = s.query(StripeSubscription).filter(StripeSubscription.stripe_subscription_id == sub_id).first()
    if sub:
        sub.status = "canceled"
        sub.price_id = None
        sub.current_period_end = None
        sub.cancel_at_period_end = False
        sub.updated_at = datetime.utcnow()
        s.commit()

    return {"ok": True, "user_id": user.id}


@router.post("/beta/invite")
def create_beta_invite(
    req: BetaInviteRequest,
    _user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    if not is_dev_admin_user(_user):
        raise HTTPException(403, "Dev admin only")
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(400, "Email required")
    ttl_hours = int(req.ttl_hours or 168)
    invite, token = R.create_invite(s, email, _user.id, ttl_hours=ttl_hours)
    return {
        "ok": True,
        "email": invite.email,
        "invite_token": token,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "created_at": invite.created_at.isoformat() if invite.created_at else None,
    }


@router.get("/beta/invites")
def list_beta_invites(
    limit: int = Query(default=100, ge=1, le=200),
    _user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    if not is_dev_admin_user(_user):
        raise HTTPException(403, "Dev admin only")
    invites = R.list_invites(s, limit=limit)
    return {
        "invites": [
            {
                "email": invite.email,
                "created_at": invite.created_at.isoformat() if invite.created_at else None,
                "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
                "accepted_at": invite.accepted_at.isoformat() if invite.accepted_at else None,
            }
            for invite in invites
        ]
    }


# ----- Mutation endpoints (require admin_mutations_enabled) -----

class ImpersonateRequest(BaseModel):
    user_id: str
    duration_minutes: int = 15  # Default 15 min, max 60


@router.post("/impersonate")
def impersonate_user(
    req: ImpersonateRequest,
    admin_user=Depends(require_admin_mutations()),
    s: Session = Depends(db),
):
    """
    Generate a short-lived JWT for a target user (admin only, mutations required).
    
    Security:
    - Requires SYNTH_ADMIN_MUTATIONS_ENABLED=true
    - Maximum token lifetime: 60 minutes
    - Fully audited
    """
    if req.duration_minutes < 1 or req.duration_minutes > 60:
        raise HTTPException(400, "Duration must be 1-60 minutes")
    
    target_user = s.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(404, "Target user not found")
    
    # Generate short-lived token
    from jose import jwt as jose_jwt
    exp = datetime.now(timezone.utc) + timedelta(minutes=req.duration_minutes)
    token = jose_jwt.encode(
        {"sub": target_user.id, "exp": exp, "impersonated_by": getattr(admin_user, 'email', 'admin')},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    
    # Audit log
    audit_logger.info(
        f"ADMIN_MUTATION: impersonate | "
        f"admin={getattr(admin_user, 'email', 'unknown')} | "
        f"target_user_id={target_user.id} | "
        f"target_email={target_user.email} | "
        f"duration_min={req.duration_minutes}"
    )
    
    return {
        "token": token,
        "expires_at": exp.isoformat(),
        "target_user": {
            "id": target_user.id,
            "email": target_user.email,
        },
        "warning": "This token grants full access as the target user. Use responsibly.",
    }


@router.post("/users/{user_id}/role")
def set_role(
    user_id: str,
    role: str,
    admin_user=Depends(require_admin_mutations()),
    s: Session = Depends(db),
):
    """Set a user's role (admin only, mutations required)."""
    if role not in [r.value for r in UserRole]:
        raise HTTPException(400, f"Invalid role: {role}. Valid roles: {[r.value for r in UserRole]}")
    
    target = s.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    
    old_role = target.role.value
    updated = R.set_user_role(s, user_id, role)
    
    # Audit log
    audit_logger.info(
        f"ADMIN_MUTATION: set_role | "
        f"admin={getattr(admin_user, 'email', 'unknown')} | "
        f"user_id={user_id} | "
        f"old_role={old_role} | "
        f"new_role={role}"
    )
    
    return {"id": updated.id, "email": updated.email, "role": updated.role.value}


# ----- AI Abuse Metrics -----

@router.get("/metrics/abuse")
def get_ai_abuse_metrics(
    _user=Depends(require_role("admin")),
):
    """
    Get AI endpoint abuse control metrics.
    
    Returns counters for:
    - Total requests
    - Requests blocked by rate limit
    - Requests blocked by concurrency limit
    - Requests blocked by size limit
    - Requests by endpoint
    """
    return get_abuse_metrics()


@router.post("/metrics/abuse/reset")
def reset_ai_abuse_metrics(
    admin_user=Depends(require_admin_mutations()),
):
    """
    Reset AI abuse metrics (requires admin mutations enabled).
    """
    reset_abuse_metrics()
    
    audit_logger.info(
        f"ADMIN_MUTATION: reset_abuse_metrics | "
        f"admin={getattr(admin_user, 'email', 'unknown')}"
    )
    
    return {"status": "ok", "message": "Abuse metrics reset"}

"""Entitlement gating dependencies."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, get_current_user
from synth_engine.storage import repo as R
from synth_engine.storage.models import User


# Plan hierarchy: free < insight < integration < constellation
# insight = basic price, integration = pro price, constellation = family price
PLAN_HIERARCHY = {"free": 0, "insight": 1, "integration": 2, "constellation": 3}


def require_plan(min_plan: str):
    """
    Dependency factory that requires user to have at least the specified plan.
    
    Plan hierarchy: free < insight < integration < constellation
    
    Usage:
        @router.post("/compute")
        def compute(user=Depends(require_plan("integration"))):
            ...
    """
    def _dep(user: User = Depends(get_current_user), s: Session = Depends(db)):
        user_plan = R.plan_for_user(s, user.id)
        user_level = PLAN_HIERARCHY.get(user_plan, 0)
        required_level = PLAN_HIERARCHY.get(min_plan, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=402,
                detail=f"Upgrade to {min_plan} required. Visit /billing/checkout?price_tier={min_plan} to subscribe.",
            )
        return user
    return _dep


def require_entitlement(action: str):
    """
    Dependency factory that checks if user is entitled to perform an action.
    
    Usage:
        @router.post("/expensive-operation")
        def expensive_op(user=Depends(require_entitlement("compute_reading"))):
            ...
    """
    def _dep(user: User = Depends(get_current_user), s: Session = Depends(db)):
        if not R.is_entitled(s, user.id, action):
            raise HTTPException(
                status_code=402,
                detail=f"Upgrade required to use {action}. Visit /billing/checkout to subscribe.",
            )
        # Record usage
        R.record_usage(s, user.id, action)
        return user
    return _dep


def check_entitlement_no_record(action: str):
    """
    Check entitlement without recording usage (for preview/check endpoints).
    """
    def _dep(user: User = Depends(get_current_user), s: Session = Depends(db)) -> bool:
        return R.is_entitled(s, user.id, action)
    return _dep

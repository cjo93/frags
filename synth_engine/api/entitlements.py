"""Entitlement gating dependencies."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, get_current_user
from synth_engine.storage import repo as R
from synth_engine.storage.models import User


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

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Header, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, get_current_user
from synth_engine.schemas.person import PersonInput
from synth_engine.storage.models import Profile
from synth_engine.storage import repo as R
from synth_engine.wallet.passkit import (
    build_default_assets,
    build_pass_json,
    build_pkpass,
    hash_wallet_token,
    load_or_create_mandala_png,
    make_fingerprint,
    new_wallet_token,
    verify_wallet_token,
)
from synth_engine.wallet.daily import build_daily_payload
from synth_engine.core.orchestrator import orchestrate

logger = logging.getLogger("synth_engine.wallet")

router = APIRouter(prefix="/wallet", tags=["wallet"])


class WalletPassRequest(BaseModel):
    profile_id: Optional[str] = None


def _wallet_error(code: str, message: str, status: int, request_id: str) -> JSONResponse:
    return JSONResponse(
        {"ok": False, "code": code, "message": message, "request_id": request_id},
        status_code=status,
        headers={"X-Request-Id": request_id},
    )


@router.post("/pass")
def create_wallet_pass(
    request: Request,
    payload: Optional[WalletPassRequest] = Body(None),
    profile_id: Optional[str] = Query(None, description="Profile to mint a wallet pass for"),
    user=Depends(get_current_user),
    s: Session = Depends(db),
):
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-Id") or str(uuid.uuid4())
    chosen_profile_id = payload.profile_id if payload and payload.profile_id else profile_id
    profile_query = s.query(Profile).filter(Profile.user_id == user.id)
    if chosen_profile_id:
        profile = profile_query.filter(Profile.id == chosen_profile_id).first()
    else:
        profile = profile_query.order_by(Profile.created_at.desc()).first()
    if not profile:
        return _wallet_error(
            "profile_required",
            "Create your profile to unlock readings and exports.",
            400,
            request_id,
        )

    person = PersonInput.model_validate_json(profile.person_json)
    try:
        fingerprint = make_fingerprint(user.id)
    except ValueError:
        return _wallet_error(
            "wallet_not_configured",
            "Wallet signing is not configured.",
            503,
            request_id,
        )

    try:
        token = new_wallet_token()
        token_hash = hash_wallet_token(token)
    except ValueError:
        return _wallet_error(
            "wallet_not_configured",
            "Wallet signing is not configured.",
            503,
            request_id,
        )

    wallet_pass = R.get_wallet_pass_by_user_profile(s, user.id, profile.id)
    if wallet_pass:
        pass_serial = wallet_pass.pass_serial
        R.update_wallet_pass_token(s, wallet_pass, token_hash)
    else:
        pass_serial = uuid.uuid4().hex
        wallet_pass = R.create_wallet_pass(
            s,
            user_id=user.id,
            profile_id=profile.id,
            fingerprint=fingerprint,
            pass_serial=pass_serial,
            auth_token_hash=token_hash,
        )

    barcode_message = f"defrag:{fingerprint}:{token}"
    try:
        mandala_png = load_or_create_mandala_png(user.id, profile.id, person)
        assets = build_default_assets(mandala_png)
        pass_json = build_pass_json(pass_serial, fingerprint, token, barcode_message)
        pkpass_bytes = build_pkpass(pass_json, assets)
    except ValueError:
        return _wallet_error(
            "wallet_not_configured",
            "Wallet signing is not configured.",
            503,
            request_id,
        )

    logger.info("wallet_pass_issued user_id=%s fingerprint=%s serial=%s", user.id, fingerprint, pass_serial)

    return Response(
        content=pkpass_bytes,
        media_type="application/vnd.apple.pkpass",
        headers={
            "Content-Disposition": "attachment; filename=defrag-mandala.pkpass",
            "Cache-Control": "no-store",
            "X-Request-Id": request_id,
        },
    )


@router.get("/daily/{fingerprint}")
def wallet_daily_reading(
    fingerprint: str,
    token: Optional[str] = Query(None, description="Wallet pass token"),
    token_header: Optional[str] = Header(None, alias="X-Wallet-Token"),
    s: Session = Depends(db),
):
    token_value = token or token_header
    if not token_value:
        raise HTTPException(401, "Wallet token required")

    wallet_pass = R.get_wallet_pass_by_fingerprint(s, fingerprint)
    if not wallet_pass or wallet_pass.revoked_at:
        raise HTTPException(404, "Wallet pass not found")

    if not verify_wallet_token(token_value, wallet_pass.auth_token_hash):
        raise HTTPException(401, "Invalid wallet token")

    profile = s.query(Profile).filter(Profile.id == wallet_pass.profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    person = PersonInput.model_validate_json(profile.person_json)
    logger.info("wallet_daily_reading fingerprint=%s", fingerprint)

    # Route through orchestrator (contract locked even if placeholders)
    result = orchestrate(user_id=wallet_pass.user_id, context={}, signals={}, request_type="daily")
    return {
        "state": result.state,
        "pass_level": result.pass_level,
        "briefing": result.briefing,
        "field": result.field,
        "kairotic_windows": result.kairotic_windows,
    }

from __future__ import annotations
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from synth_engine.storage.db import SessionLocal
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

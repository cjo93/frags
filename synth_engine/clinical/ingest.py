from __future__ import annotations

from typing import Dict, Any


def validate_0_1(name: str, v: float) -> float:
    if v is None:
        raise ValueError(f"{name} missing")
    v = float(v)
    if not (0.0 <= v <= 1.0):
        raise ValueError(f"{name} must be in 0..1")
    return v


def require_ts(payload: Dict[str, Any]) -> str:
    ts = payload.get("timestamp")
    if not ts or not isinstance(ts, str):
        raise ValueError("timestamp required (ISO string)")
    return ts


def normalize_big5(payload: Dict[str, Any]) -> Dict[str, Any]:
    ts = require_ts(payload)
    return {
        "O": validate_0_1("O", payload.get("O")),
        "C": validate_0_1("C", payload.get("C")),
        "E": validate_0_1("E", payload.get("E")),
        "A": validate_0_1("A", payload.get("A")),
        "N": validate_0_1("N", payload.get("N")),
        "timestamp": ts,
    }


def normalize_attachment(payload: Dict[str, Any]) -> Dict[str, Any]:
    ts = require_ts(payload)
    return {
        "anxiety": validate_0_1("anxiety", payload.get("anxiety")),
        "avoidance": validate_0_1("avoidance", payload.get("avoidance")),
        "timestamp": ts,
    }


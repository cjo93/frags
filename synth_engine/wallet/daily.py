from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from synth_engine.compute.astrology import compute_natal
from synth_engine.compute.astrology_timing import compute_timing_window
from synth_engine.schemas.person import PersonInput
from synth_engine.utils.timeutils import localize_birth


def _theme_from_priors(priors: Dict[str, float]) -> str:
    if not priors:
        return "Balanced"
    key = max(priors, key=priors.get)
    return {
        "BIS": "Grounding",
        "BAS": "Activation",
        "FFFS": "Stabilize",
    }.get(key, "Balanced")


def _intensity(value: float) -> str:
    if value < 0.33:
        return "low"
    if value < 0.66:
        return "medium"
    return "high"


def _pressure_windows(priors: Dict[str, float]) -> List[Dict[str, str]]:
    intensity = _intensity(max(priors.values()) if priors else 0.2)
    return [
        {"label": "Morning", "intensity": intensity},
        {"label": "Evening", "intensity": "medium" if intensity == "high" else intensity},
    ]


def _reset_steps(theme: str) -> List[str]:
    if theme == "Activation":
        return [
            "90-second reset: slow exhale, unclench jaw, reset posture.",
            "Pick one priority and give it 20 focused minutes.",
        ]
    if theme == "Stabilize":
        return [
            "90-second reset: name the pressure, then breathe out for 6 seconds.",
            "Do one grounding action before any big decision.",
        ]
    return [
        "90-second reset: soften shoulders and slow the breath.",
        "Focus on one small, winnable task.",
    ]


def build_daily_payload(person: PersonInput) -> Dict[str, object]:
    birth = person.birth
    birth_time = birth.time or "12:00:00"
    dt_utc = localize_birth(birth.date, birth_time, birth.birth_timezone)
    natal = compute_natal(dt_utc, birth.location.lat, birth.location.lon)

    now = datetime.now(timezone.utc)
    window = compute_timing_window(natal, birth.location.lat, birth.location.lon, now, days=3)
    today = window["days"][0]
    priors = today.get("priors", {})
    theme = _theme_from_priors(priors)

    return {
        "date": today["date"],
        "theme": theme,
        "pressure_windows": _pressure_windows(priors),
        "reset_steps": _reset_steps(theme),
        "notes": "Sanitized daily reading. Not medical advice.",
    }

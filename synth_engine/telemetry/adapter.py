from __future__ import annotations

from typing import Dict, Any


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def infer_context(
    page: str,
    dwell_ms: int,
    clicks: int,
    scroll_depth: int,
    extra: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    extra = extra or {}

    dwell = clamp01(dwell_ms / 180000.0)
    click = clamp01(clicks / 25.0)
    scroll = clamp01(scroll_depth / 100.0)

    page_l = (page or "").lower()
    distress_page = 0.0
    if any(k in page_l for k in ["constellation", "family", "conflict", "timing", "transit", "attachment", "shadow"]):
        distress_page = 0.25

    stress = clamp01(0.40 * dwell + 0.20 * click + 0.20 * scroll + 0.20 * distress_page)

    return {
        "stress": stress,
        "confidence": 0.25,
        "drivers": {"dwell": dwell, "click": click, "scroll": scroll, "distress_page": distress_page},
        "policy": {"recommended_prompt": "micro_checkin", "max_prompts_per_day": 2},
        "notes": "Low-confidence inferred context; not ground truth.",
    }


from __future__ import annotations
from typing import Dict, Any

def compute_hd(*, birth_utc_iso: str, lat: float, lon: float) -> Dict[str,Any]:
    # Plug in deterministic calculator you control
    return {"available": False, "note": "HD calculator not wired.", "inputs": {"birth_utc_iso": birth_utc_iso, "lat": lat, "lon": lon}}

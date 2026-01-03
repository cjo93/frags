from __future__ import annotations
from datetime import datetime, timezone
from typing import Dict, Any, List
import swisseph as swe

from synth_engine.config import settings
from synth_engine.utils.hashing import sha256_inputs

PLANETS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY, "Venus": swe.VENUS,
    "Mars": swe.MARS, "Jupiter": swe.JUPITER, "Saturn": swe.SATURN,
    "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE, "Pluto": swe.PLUTO,
}

ASPECTS = {"conj":0.0, "opp":180.0, "trine":120.0, "square":90.0, "sextile":60.0}

def wrap360(x: float) -> float:
    x = x % 360.0
    return x + 360.0 if x < 0 else x

def ang_diff(a: float, b: float) -> float:
    d = abs(wrap360(a) - wrap360(b)) % 360.0
    return min(d, 360.0 - d)

def jd_ut(dt: datetime) -> float:
    dt_utc = dt.astimezone(timezone.utc)
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day,
                      dt_utc.hour + dt_utc.minute/60 + dt_utc.second/3600)

def aspect_strength(orb: float, max_orb: float) -> float:
    if orb >= max_orb:
        return 0.0
    x = orb / max_orb
    return float((1.0 - x) ** 2)

def compute_whole_sign_houses(asc_lon: float) -> Dict[str, float]:
    sign_index = int(wrap360(asc_lon) // 30)
    h1_cusp = sign_index * 30.0
    return {f"H{i}": wrap360(h1_cusp + (i-1)*30.0) for i in range(1,13)}

def compute_natal(dt_utc: datetime, lat: float, lon: float) -> Dict[str, Any]:
    jd = jd_ut(dt_utc)
    swe.set_topo(lon, lat, 0)

    planets = {}
    for name, p in PLANETS.items():
        xx, _ = swe.calc_ut(jd, p, swe.FLG_SWIEPH | swe.FLG_SPEED)
        planets[name] = {"lon": wrap360(xx[0]), "speed": float(xx[3]), "retro": bool(xx[3] < 0)}

    cusps, ascmc = swe.houses_ex(jd, lat, lon, b'P')
    angles = {
        "ASC": wrap360(ascmc[0]),
        "MC": wrap360(ascmc[1]),
        "DSC": wrap360(ascmc[6]),
        "IC": wrap360(ascmc[7]),
    }
    houses_placidus = {f"H{i}": wrap360(cusps[i]) for i in range(1,13)}
    houses_ws = compute_whole_sign_houses(angles["ASC"])

    objs = {**{k:v["lon"] for k,v in planets.items()}, **angles}
    aspects: List[Dict[str,Any]] = []
    max_orb = settings.aspect_max_orb_deg
    keys = list(objs.keys())
    for i in range(len(keys)):
        for j in range(i+1, len(keys)):
            a, b = keys[i], keys[j]
            d = ang_diff(objs[a], objs[b])
            for asp_name, asp_deg in ASPECTS.items():
                orb = abs(d - asp_deg)
                if orb <= max_orb:
                    aspects.append({
                        "a": a, "b": b,
                        "type": asp_name,
                        "exact_deg": asp_deg,
                        "orb": float(orb),
                        "strength": aspect_strength(float(orb), max_orb),
                    })
    aspects.sort(key=lambda x: (-x["strength"], x["orb"]))

    inputs_hash = sha256_inputs({"dt_utc": dt_utc.isoformat(), "lat": lat, "lon": lon, "cfg": settings.model_dump()})
    return {
        "settings": {
            "ephemeris": "swisseph",
            "zodiac": settings.zodiac,
            "house_systems": settings.house_systems,
            "aspect_max_orb_deg": settings.aspect_max_orb_deg,
        },
        "planets": planets,
        "angles": angles,
        "houses": {"placidus": houses_placidus, "whole_sign": houses_ws},
        "aspects": aspects,
        "inputs_hash": inputs_hash,
    }

from __future__ import annotations
from datetime import datetime, timedelta
from typing import Dict, Any, List
import math
import swisseph as swe

from synth_engine.config import settings
from synth_engine.compute.astrology import PLANETS, ASPECTS, wrap360, ang_diff, jd_ut, aspect_strength

def compute_transits(as_of_utc: datetime, lat: float, lon: float) -> Dict[str, Any]:
    jd = jd_ut(as_of_utc)
    swe.set_topo(lon, lat, 0)
    trans = {}
    for name, p in PLANETS.items():
        xx, _ = swe.calc_ut(jd, p, swe.FLG_SWIEPH | swe.FLG_SPEED)
        trans[name] = {"lon": wrap360(xx[0]), "speed": float(xx[3]), "retro": bool(xx[3] < 0)}
    return {"as_of": as_of_utc.isoformat(), "planets": trans}

def detect_transit_events(natal: Dict[str,Any], transits: Dict[str,Any], orb: float, tier: str) -> List[Dict[str,Any]]:
    natal_objs = {**{k:v["lon"] for k,v in natal["planets"].items()}, **natal["angles"]}
    trans_objs = {k:v["lon"] for k,v in transits["planets"].items()}
    events: List[Dict[str,Any]] = []
    for t_name, t_lon in trans_objs.items():
        for n_name, n_lon in natal_objs.items():
            d = ang_diff(t_lon, n_lon)
            for asp_name, asp_deg in ASPECTS.items():
                o = abs(d - asp_deg)
                if o <= orb:
                    events.append({
                        "tier": tier, "transit": t_name, "natal": n_name,
                        "aspect": asp_name, "orb": float(o),
                        "strength": aspect_strength(float(o), orb),
                    })
    events.sort(key=lambda e: (-e["strength"], e["orb"]))
    return events

def squash(x: float) -> float:
    return float(1.0 - math.exp(-max(0.0, x)))

def state_priors_from_transits(events: List[Dict[str,Any]]) -> Dict[str,float]:
    BIS=BAS=FFFS=0.0
    for e in events:
        t = e["transit"]; asp = e["aspect"]; s = e["strength"]
        hard = asp in ("conj","square","opp")
        if t == "Saturn":
            BIS += (0.8 if hard else 0.4) * s
        if t == "Mars":
            BAS += (0.7 if hard else 0.4) * s
            FFFS += (0.6 if hard else 0.2) * s
        if t == "Jupiter":
            BAS += 0.5 * s
        if t in ("Uranus","Pluto") and hard:
            FFFS += 0.4 * s
            BIS += 0.3 * s
    return {"BIS": squash(BIS), "BAS": squash(BAS), "FFFS": squash(FFFS)}

def compute_timing_window(natal: Dict[str,Any], lat: float, lon: float, start_utc: datetime, days: int = 14) -> Dict[str,Any]:
    out = []
    for i in range(days):
        dt = start_utc + timedelta(days=i)
        trans = compute_transits(dt, lat, lon)
        tight = detect_transit_events(natal, trans, settings.timing_orb_tight, "tight")
        medium = detect_transit_events(natal, trans, settings.timing_orb_medium, "medium")
        events = (tight + medium)[:50]
        priors = state_priors_from_transits(events)
        out.append({"date": dt.date().isoformat(), "priors": priors, "events": events})
    return {"as_of": start_utc.isoformat(), "days": out, "policy": {"tight_orb": settings.timing_orb_tight, "medium_orb": settings.timing_orb_medium}}

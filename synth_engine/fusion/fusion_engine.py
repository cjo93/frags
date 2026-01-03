from __future__ import annotations
from typing import Dict, Any, Optional, Tuple

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def normalize_weights(w_user: float, w_timing: float, w_context: float) -> Tuple[float,float,float]:
    w_user = max(0.0, w_user); w_timing = max(0.0, w_timing); w_context = max(0.0, w_context)
    s = w_user + w_timing + w_context
    if s <= 1e-9:
        return (0.6, 0.2, 0.2)
    return (w_user/s, w_timing/s, w_context/s)

def to01_from_0_100(v: int) -> Optional[float]:
    if v is None or v < 0:
        return None
    return float(clamp(v/100.0, 0.0, 1.0))

def build_state_from_sources(
    checkin: Optional[Dict[str, Any]],
    context_inferred: Optional[Dict[str, float]],
    timing_priors: Optional[Dict[str, float]],
    state_model: Optional[Dict[str, float]],
) -> Dict[str, Any]:
    sm = state_model or {}
    w_user, w_timing, w_context = normalize_weights(sm.get("w_user",0.60), sm.get("w_timing",0.20), sm.get("w_context",0.20))
    stress_bias = float(sm.get("stress_bias", 0.0))
    stress_scale = float(sm.get("stress_scale", 1.0))

    stress_gt = sleep_q = mood = energy = None
    if checkin:
        stress_gt = to01_from_0_100(int(checkin.get("stress",-1)))
        sleep_q = to01_from_0_100(int(checkin.get("sleep_quality",-1)))
        mood = to01_from_0_100(int(checkin.get("mood",-1)))
        energy = to01_from_0_100(int(checkin.get("energy",-1)))

    ctx_stress = float(context_inferred.get("stress",0.0)) if context_inferred else None

    tBIS = float(timing_priors.get("BIS",0.0)) if timing_priors else 0.0
    tBAS = float(timing_priors.get("BAS",0.0)) if timing_priors else 0.0
    tFFFS = float(timing_priors.get("FFFS",0.0)) if timing_priors else 0.0

    if stress_gt is not None:
        stress = stress_gt
        stress_conf = 0.80 if checkin.get("source","user") == "user" else 0.65
        drivers = [{"source":"checkin","value":stress_gt,"weight":w_user}]
    else:
        base = 0.0
        if ctx_stress is not None:
            base += w_context * ctx_stress
        base += w_timing * (0.65*tBIS + 0.35*tFFFS)
        stress = clamp(base, 0.0, 1.0)
        stress_conf = 0.45
        drivers = []
        if ctx_stress is not None:
            drivers.append({"source":"context","value":ctx_stress,"weight":w_context})
        drivers.append({"source":"timing_astro","value":(0.65*tBIS + 0.35*tFFFS),"weight":w_timing})

    stress = clamp((stress * stress_scale) + stress_bias, 0.0, 1.0)

    BIS = clamp(0.65*stress + 0.35*tBIS, 0.0, 1.0)
    BAS = clamp(0.70*tBAS + 0.30*(energy if energy is not None else 0.5), 0.0, 1.0)
    FFFS = clamp(0.60*tFFFS + 0.40*stress, 0.0, 1.0)

    exec_load = clamp(0.60*stress + 0.40*(1.0 - (sleep_q if sleep_q is not None else 0.5)), 0.0, 1.0)
    recovery = clamp((sleep_q if sleep_q is not None else 0.5) * (1.0 - 0.6*stress), 0.0, 1.0)
    affect_volatility = clamp(0.70*stress + 0.30*(1.0 - (mood if mood is not None else 0.5)), 0.0, 1.0)
    rumination = clamp(0.75*BIS + 0.25*stress, 0.0, 1.0)
    social_appetite = clamp(0.60*(1.0 - BIS) + 0.40*(energy if energy is not None else 0.5), 0.0, 1.0)

    if stress_gt is not None:
        unc = {"stress":0.30,"BIS":0.35,"BAS":0.45,"FFFS":0.40,"exec_load":0.40,"recovery":0.45,"affect_volatility":0.40,"rumination":0.40,"social_appetite":0.45}
    else:
        unc = {"stress":0.60,"BIS":0.60,"BAS":0.65,"FFFS":0.65,"exec_load":0.65,"recovery":0.65,"affect_volatility":0.65,"rumination":0.65,"social_appetite":0.65}

    return {
        "vector": {"stress":float(stress),"BIS":float(BIS),"BAS":float(BAS),"FFFS":float(FFFS),
                   "exec_load":float(exec_load),"recovery":float(recovery),
                   "affect_volatility":float(affect_volatility),"rumination":float(rumination),
                   "social_appetite":float(social_appetite)},
        "uncertainty": unc,
        "drivers": {"stress":drivers},
        "calibration_questions": [] if stress_gt is not None else [
            "Quick check: how stressed do you feel right now? (Very Low / Low / Medium / High / Very High)"
        ],
        "state_model_used": {"w_user":w_user,"w_timing":w_timing,"w_context":w_context,"stress_bias":stress_bias,"stress_scale":stress_scale},
        "confidence": float(stress_conf),
    }

def update_state_model_after_checkin(
    current_model: Dict[str, float],
    timing_signal: float,
    stress_pred: float,
    stress_gt: float,
    lr_bias: float = 0.05,
    lr_w: float = 0.02,
    max_timing_weight: float = 0.35,
) -> Dict[str, float]:
    w_user, w_timing, w_context = normalize_weights(current_model.get("w_user",0.60), current_model.get("w_timing",0.20), current_model.get("w_context",0.20))
    bias = float(current_model.get("stress_bias",0.0))
    scale = float(current_model.get("stress_scale",1.0))
    err = float(stress_gt - stress_pred)

    bias = clamp(bias + lr_bias * err, -0.25, 0.25)

    centered = (timing_signal - 0.5)
    w_timing = clamp(w_timing + lr_w * err * centered, 0.05, max_timing_weight)

    w_user = clamp(1.0 - w_timing - w_context, 0.40, 0.90)
    w_user, w_timing, w_context = normalize_weights(w_user, w_timing, w_context)

    return {"w_user":float(w_user),"w_timing":float(w_timing),"w_context":float(w_context),"stress_bias":float(bias),"stress_scale":float(scale)}

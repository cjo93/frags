from __future__ import annotations

from typing import Dict, Any, List


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def bowen_curriculum(constellation: Dict[str, Any], bowen: Dict[str, Any]) -> Dict[str, Any]:
    """
    Output: action ladder with:
      - focus areas derived from triangle risk + low differentiation proxy
      - exercises + scripts
    """
    dos = bowen.get("differentiation_proxy", {}) or {}
    triangles = bowen.get("triangles", []) or []

    low = sorted([(pid, float(v)) for pid, v in dos.items()], key=lambda x: x[1])[:3]
    top_tri = sorted(triangles, key=lambda t: -float(t.get("risk", 0.0)))[:3]

    focus: List[str] = []
    if low:
        focus.append("Increase differentiation under stress (self-regulation + boundaries).")
    if top_tri:
        focus.append("De-triangulate: reduce coalition dynamics and direct communication.")

    ladder = [
        {
            "level": 1,
            "title": "Stabilize physiology before conversations",
            "actions": [
                "Before a hard interaction, do 2 minutes of slow breathing (exhale longer than inhale).",
                "Write a 1-sentence goal: 'I want clarity, not victory.'",
            ],
            "success_criteria": "You enter the conversation with lower reactivity (subjective).",
        },
        {
            "level": 2,
            "title": "Define a boundary in neutral language",
            "actions": [
                "Use: 'When X happens, I will do Y.' (No blame, no diagnosis.)",
                "Example: 'If voices rise, I will pause and revisit later today.'",
            ],
            "success_criteria": "Boundary stated once, calmly, and repeated without escalation.",
        },
        {
            "level": 3,
            "title": "De-triangulate (direct message, no third-party recruiting)",
            "actions": [
                "If you want to vent, label it: 'I need to vent for 5 minutes; no action needed.'",
                "If there is a conflict with person B, speak to B directly rather than through C.",
            ],
            "success_criteria": "You reduce back-channeling and speak directly.",
        },
        {
            "level": 4,
            "title": "Repair sequence after rupture",
            "actions": [
                "Name impact: 'That landed as harsh.'",
                "Own your piece: 'I escalated when I felt cornered.'",
                "Request next time: 'Can we take a 10-minute break when this starts?'",
            ],
            "success_criteria": "Conflict ends with a clear next-step agreement.",
        },
    ]

    notes: List[str] = []
    if low:
        notes.append(f"Lowest differentiation proxy nodes: {', '.join([f'{pid}({v:.2f})' for pid, v in low])}.")
    if top_tri:
        tri_str = ", ".join([f"{t['a']}-{t['b']}-{t['c']}({float(t.get('risk', 0.0)):.2f})" for t in top_tri])
        notes.append("Highest triangle risks: " + tri_str + ".")

    return {
        "focus": focus[:6],
        "ladder": ladder,
        "notes": notes,
        "epistemic_class": "inferred",
        "disclaimer": "Educational guidance; not therapy or diagnosis.",
    }

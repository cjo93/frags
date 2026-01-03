from __future__ import annotations

from typing import Dict, Any, List, Optional


def _contains_any(text: str, needles: List[str]) -> bool:
    t = (text or "").lower()
    return any(n.lower() in t for n in needles)


def jung_overlay(*, journal_text: Optional[str], latent: Dict[str, Any]) -> Dict[str, Any]:
    journal_text = journal_text or ""
    state = latent.get("state") or {}
    traits = latent.get("traits") or {}

    stress = float(state.get("stress", 0.5))
    bis = float(state.get("BIS", 0.5))
    rum = float(state.get("rumination", 0.5))
    N = float(traits.get("N", 0.5)) if isinstance(traits, dict) and "N" in traits else 0.5

    tags: List[str] = []
    prompts: List[str] = []

    if _contains_any(journal_text, ["identity", "who am i", "authentic", "mask", "persona", "image"]):
        tags.append("Persona / identity tension")
        prompts.append("Where are you performing vs expressing something true today?")

    if _contains_any(journal_text, ["triggered", "hate", "disgust", "can't stand", "projection", "judgment"]):
        tags.append("Shadow activation (possible projection themes)")
        prompts.append("What quality in the other person might be reflecting something disowned in you?")

    if (stress > 0.7 and (bis > 0.65 or rum > 0.65)) or N > 0.75:
        tags.append("Heightened reactivity window (shadow sensitivity)")
        prompts.append("What boundary or unmet need might this reaction be protecting?")

    if _contains_any(journal_text, ["meaning", "purpose", "calling", "why", "direction"]):
        tags.append("Individuation / meaning-making themes")
        prompts.append("What would a 1% move toward meaning look like today (small, concrete)?")

    if _contains_any(journal_text, ["mother", "father", "partner", "relationship", "family"]):
        tags.append("Relational pattern exploration")
        prompts.append("What pattern repeats across relationships, and what is your smallest interruption of it?")

    if not tags:
        tags.append("Reflection mode (low specificity)")
        prompts.append("Name the strongest emotion present right now. What is it asking for?")

    return {
        "epistemic_class": "symbolic",
        "tags": tags[:8],
        "prompts": prompts[:6],
        "notes": "Symbolic reflection only; not clinical assessment.",
    }


def jung_constellation_summary(*, constellation: Dict[str, Any], bowen: Dict[str, Any]) -> Dict[str, Any]:
    """
    Symbolic-only narrative framing of the constellation dynamics.
    """
    triangles = bowen.get("triangles", []) or []
    dos = bowen.get("differentiation_proxy", {}) or {}
    top_tri = sorted(triangles, key=lambda t: -float(t.get("risk", 0.0)))[:2]
    low = sorted([(pid, float(v)) for pid, v in dos.items()], key=lambda x: x[1])[:2]

    tags = ["Family myth / narrative inquiry", "Roles and projections (symbolic framing)"]
    prompts = [
        "If this family dynamic were a story, what role do you feel pushed into?",
        "What is the unspoken rule that everyone follows but nobody names?",
    ]
    if top_tri:
        prompts.append("Where does tension get redirected to a third person instead of addressed directly?")
    if low:
        prompts.append("What would it look like to stay connected without absorbing others’ emotions?")

    return {
        "epistemic_class": "symbolic",
        "tags": tags,
        "prompts": prompts[:6],
        "notes": "Symbolic reflection only; not clinical assessment.",
    }


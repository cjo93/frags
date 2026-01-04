"""Deterministic synthesis engine.

Generates structured readings from computed layers without requiring LLM.
Output contract is compatible with future AI-enhanced synthesis.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from synth_engine.storage import repo as R
from synth_engine.storage.models import Profile, ComputedLayer


def _safe_get(d: Optional[Dict], *keys, default=None):
    """Safely traverse nested dicts."""
    if d is None:
        return default
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k)
        if d is None:
            return default
    return d


def _format_trait(name: str, value: float) -> str:
    """Convert 0-1 trait value to human-readable description."""
    if value >= 0.75:
        return f"High {name}"
    elif value >= 0.5:
        return f"Moderate-high {name}"
    elif value >= 0.25:
        return f"Moderate {name}"
    else:
        return f"Lower {name}"


def _section_overview(profile: Profile, natal: Optional[Dict], latent: Optional[Dict]) -> Dict[str, Any]:
    """Build overview section from natal and latent layers."""
    bullets: List[str] = []
    sources: List[Dict[str, str]] = []

    # From natal astrology
    if natal:
        sources.append({"layer": "natal_astro", "type": "computed"})
        sun = _safe_get(natal, "sun", "sign")
        moon = _safe_get(natal, "moon", "sign")
        asc = _safe_get(natal, "ascendant", "sign")
        if sun:
            bullets.append(f"Sun in {sun}: core identity and conscious expression")
        if moon:
            bullets.append(f"Moon in {moon}: emotional needs and inner world")
        if asc:
            bullets.append(f"Ascendant in {asc}: outward persona and first impressions")

    # From latent traits
    if latent:
        sources.append({"layer": "latent", "type": "computed"})
        traits = _safe_get(latent, "traits", default={})
        if isinstance(traits, dict):
            for trait, value in sorted(traits.items(), key=lambda x: -x[1])[:3]:
                if isinstance(value, (int, float)):
                    bullets.append(_format_trait(trait, float(value)))

    if not bullets:
        bullets.append("Complete your profile to receive personalized insights.")

    return {
        "id": "overview",
        "title": "Overview",
        "bullets": bullets,
        "sources": sources,
    }


def _section_timing(timing: Optional[Dict]) -> Dict[str, Any]:
    """Build timing section from timing layer."""
    bullets: List[str] = []
    sources: List[Dict[str, str]] = []

    if timing:
        sources.append({"layer": "timing", "type": "computed"})
        
        # Transit events
        events = timing.get("events", [])
        if events:
            for event in events[:3]:
                name = event.get("name", "")
                desc = event.get("description", "")
                if name and desc:
                    bullets.append(f"{name}: {desc}")
                elif name:
                    bullets.append(name)

        # State priors
        priors = timing.get("state_priors", {})
        if priors:
            bis = priors.get("BIS", 0)
            bas = priors.get("BAS", 0)
            if bis > 0.6:
                bullets.append("May experience heightened caution or withdrawal tendencies")
            elif bas > 0.6:
                bullets.append("May feel more driven toward goals and rewards")
            
            if not bullets:
                bullets.append("Timing influences appear relatively balanced")

    if not bullets:
        bullets.append("No timing data available. Compute a reading to generate timing insights.")

    return {
        "id": "timing",
        "title": "Current Timing",
        "bullets": bullets,
        "sources": sources,
    }


def _section_state(state: Optional[Dict], checkins: List[Dict]) -> Dict[str, Any]:
    """Build current state section from state vector and recent check-ins."""
    bullets: List[str] = []
    sources: List[Dict[str, str]] = []

    if state:
        sources.append({"layer": "state", "type": "computed"})
        vector = state.get("vector", {})
        
        stress = vector.get("stress", 0)
        recovery = vector.get("recovery", 0)
        exec_load = vector.get("exec_load", 0)
        
        if stress > 0.7:
            bullets.append("Elevated stress levels detected—consider prioritizing recovery")
        elif stress > 0.4:
            bullets.append("Moderate stress levels—maintain awareness of capacity")
        else:
            bullets.append("Stress appears well-managed")
        
        if recovery < 0.4:
            bullets.append("Recovery capacity may be limited—sleep and rest are important")
        
        if exec_load > 0.6:
            bullets.append("Executive load is high—reduce decision fatigue where possible")

    if checkins:
        sources.append({"layer": "checkins", "type": "user_input"})
        recent = checkins[0] if checkins else {}
        mood = recent.get("mood", -1)
        energy = recent.get("energy", -1)
        
        if mood >= 0:
            if mood > 70:
                bullets.append("Recent mood reported as positive")
            elif mood < 40:
                bullets.append("Recent mood reported as lower than usual")
        
        if energy >= 0:
            if energy > 70:
                bullets.append("Energy levels reported as good")
            elif energy < 40:
                bullets.append("Energy levels reported as depleted")

    if not bullets:
        bullets.append("Check in regularly to track your state over time.")

    return {
        "id": "state",
        "title": "Current State",
        "bullets": bullets,
        "sources": sources,
    }


def _section_patterns(latent: Optional[Dict], jung: Optional[Dict]) -> Dict[str, Any]:
    """Build patterns section from latent traits and Jung overlay."""
    bullets: List[str] = []
    sources: List[Dict[str, str]] = []

    if latent:
        sources.append({"layer": "latent", "type": "computed"})
        
        # BIS/BAS patterns
        traits = _safe_get(latent, "traits", default={})
        bis_trait = traits.get("BIS", 0) if isinstance(traits, dict) else 0
        bas_trait = traits.get("BAS", 0) if isinstance(traits, dict) else 0
        
        if bis_trait > 0.6 and bas_trait < 0.4:
            bullets.append("Tendency toward caution and careful analysis before action")
        elif bas_trait > 0.6 and bis_trait < 0.4:
            bullets.append("Tendency toward approach behavior and reward pursuit")
        elif bis_trait > 0.6 and bas_trait > 0.6:
            bullets.append("High sensitivity to both rewards and threats—may experience ambivalence")

    if jung:
        sources.append({"layer": "jung", "type": "computed"})
        shadow = jung.get("shadow_themes", [])
        if shadow:
            bullets.append(f"Shadow themes to explore: {', '.join(shadow[:3])}")
        
        integration = jung.get("integration_paths", [])
        if integration:
            bullets.append(f"Growth paths: {integration[0]}" if integration else "")

    if not bullets:
        bullets.append("Complete more layers to reveal deeper patterns.")

    return {
        "id": "patterns",
        "title": "Patterns",
        "bullets": bullets,
        "sources": sources,
    }


def _section_recommendations(state: Optional[Dict], timing: Optional[Dict]) -> Dict[str, Any]:
    """Build actionable recommendations based on state and timing."""
    bullets: List[str] = []
    sources: List[Dict[str, str]] = []

    stress = 0.5
    recovery = 0.5
    
    if state:
        sources.append({"layer": "state", "type": "computed"})
        vector = state.get("vector", {})
        stress = vector.get("stress", 0.5)
        recovery = vector.get("recovery", 0.5)

    if timing:
        sources.append({"layer": "timing", "type": "computed"})

    # Generate recommendations based on state
    if stress > 0.6:
        bullets.append("Try: 2-minute slow breathing before challenging interactions")
        bullets.append("Consider: reducing commitments for the next few days")
    elif stress > 0.4:
        bullets.append("Maintain: current boundaries and self-care routines")
    else:
        bullets.append("Good time for: tackling challenging tasks while capacity is high")

    if recovery < 0.4:
        bullets.append("Priority: protect sleep and limit late-night activities")
    
    # Always include grounding recommendation
    bullets.append("Daily practice: brief journaling or check-in to track patterns")

    return {
        "id": "recommendations",
        "title": "What to Try",
        "bullets": bullets,
        "sources": sources,
    }


def synthesize_profile(s: Session, profile_id: str) -> Dict[str, Any]:
    """
    Generate a deterministic synthesis for a profile.
    
    Returns structured sections with citations, compatible with AI-enhanced synthesis.
    """
    # Load profile
    profile = s.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise ValueError(f"Profile not found: {profile_id}")

    # Load all relevant layers
    natal = R.latest_layer_payload(s, profile_id, "natal_astro")
    timing = R.latest_layer_payload(s, profile_id, "timing")
    latent = R.latest_layer_payload(s, profile_id, "latent")
    jung = R.latest_layer_payload(s, profile_id, "jung")
    
    # Load recent check-ins
    checkins_raw, _, _ = R.list_checkins_keyset(s, profile_id, limit=5)
    checkins = [
        {
            "ts": c.ts,
            "stress": c.stress,
            "mood": c.mood,
            "energy": c.energy,
        }
        for c in checkins_raw
    ]

    # Build state from fusion engine if we have enough data
    state = None
    if latent:
        state = latent.get("state")

    # Build sections
    sections = [
        _section_overview(profile, natal, latent),
        _section_timing(timing),
        _section_state(state, checkins),
        _section_patterns(latent, jung),
        _section_recommendations(state, timing),
    ]

    # Filter out empty sections
    sections = [sec for sec in sections if sec.get("bullets")]

    return {
        "profile_id": profile_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections": sections,
        "layer_versions": {
            "natal_astro": bool(natal),
            "timing": bool(timing),
            "latent": bool(latent),
            "jung": bool(jung),
        },
        "disclaimer": (
            "This synthesis is generated from computed layers and does not constitute "
            "medical, psychological, or professional advice. Patterns shown are "
            "tendencies and possibilities, not certainties. For clinical concerns, "
            "consult qualified professionals."
        ),
    }


def synthesize_constellation(s: Session, constellation_id: str) -> Dict[str, Any]:
    """
    Generate a deterministic synthesis for a constellation (relational system).
    """
    from synth_engine.storage.models import Constellation, ConstellationMember
    
    constellation = s.query(Constellation).filter(Constellation.id == constellation_id).first()
    if not constellation:
        raise ValueError(f"Constellation not found: {constellation_id}")

    # Load members
    members = R.list_members(s, constellation_id)
    
    # Load constellation layers
    bowen = None
    curriculum = None
    jung_summary = None
    
    # Try to get latest constellation layers
    for layer_name in ["bowen", "curriculum", "jung_summary"]:
        payload = R.latest_constellation_layer_payload(s, constellation_id, layer_name)
        if payload:
            if layer_name == "bowen":
                bowen = payload
            elif layer_name == "curriculum":
                curriculum = payload
            elif layer_name == "jung_summary":
                jung_summary = payload

    sections = []

    # Overview section
    overview_bullets = [
        f"System includes {len(members)} member(s)",
    ]
    if bowen:
        triangles = bowen.get("triangles", [])
        if triangles:
            overview_bullets.append(f"{len(triangles)} relational triangle(s) identified")
    
    sections.append({
        "id": "overview",
        "title": "System Overview",
        "bullets": overview_bullets,
        "sources": [{"layer": "constellation", "type": "computed"}],
    })

    # Dynamics section from Bowen
    if bowen:
        dynamics_bullets = []
        triangles = bowen.get("triangles", [])
        high_risk = [t for t in triangles if t.get("risk", 0) > 0.5]
        if high_risk:
            for t in high_risk[:2]:
                dynamics_bullets.append(
                    f"Triangle {t.get('a', '?')}-{t.get('b', '?')}-{t.get('c', '?')}: "
                    f"elevated coalition risk ({t.get('risk', 0):.0%})"
                )
        
        dos = bowen.get("differentiation_proxy", {})
        if dos:
            low_diff = [(k, v) for k, v in dos.items() if v < 0.4]
            if low_diff:
                dynamics_bullets.append(
                    f"Lower differentiation observed: {', '.join([k for k, v in low_diff[:3]])}"
                )
        
        if dynamics_bullets:
            sections.append({
                "id": "dynamics",
                "title": "System Dynamics",
                "bullets": dynamics_bullets,
                "sources": [{"layer": "bowen", "type": "computed"}],
            })

    # Curriculum section
    if curriculum:
        ladder = curriculum.get("ladder", [])
        if ladder:
            curriculum_bullets = []
            for step in ladder[:3]:
                title = step.get("title", "")
                if title:
                    curriculum_bullets.append(f"Level {step.get('level', '?')}: {title}")
            
            if curriculum_bullets:
                sections.append({
                    "id": "growth",
                    "title": "Growth Pathway",
                    "bullets": curriculum_bullets,
                    "sources": [{"layer": "curriculum", "type": "computed"}],
                })

    return {
        "constellation_id": constellation_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections": sections,
        "disclaimer": (
            "This synthesis is generated from computed relational layers and does not "
            "constitute therapy or professional advice. For family or relationship concerns, "
            "consult qualified professionals."
        ),
    }

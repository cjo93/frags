"""AI synthesis / chat endpoints."""
from __future__ import annotations

import json
import traceback
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, get_current_user, require_role
from synth_engine.config import settings
from synth_engine.storage import repo as R
from synth_engine.storage.models import User, Profile, ComputedLayer

router = APIRouter(prefix="/ai", tags=["ai"])


def _build_context_for_profile(s: Session, profile_id: str) -> Dict[str, Any]:
    """Build grounded context from stored layers for a profile."""
    context: Dict[str, Any] = {"profile_id": profile_id, "layers": {}, "checkins": []}

    # Load profile
    profile = s.query(Profile).filter(Profile.id == profile_id).first()
    if profile:
        try:
            context["person"] = json.loads(profile.person_json)
        except Exception:
            pass

    # Load latest computed layers
    for layer_name in ["natal_astro", "timing", "latent", "numerology", "humandesign", "genekeys"]:
        payload = R.latest_layer_payload(s, profile_id, layer_name)
        if payload:
            context["layers"][layer_name] = payload

    # Load recent check-ins
    checkins, _, _ = R.list_checkins_keyset(s, profile_id, limit=5)
    context["checkins"] = [
        {
            "ts": c.ts,
            "stress": c.stress,
            "mood": c.mood,
            "energy": c.energy,
            "notes": c.notes[:200] if c.notes else "",
        }
        for c in checkins
    ]

    return context


def _build_context_for_constellation(s: Session, constellation_id: str) -> Dict[str, Any]:
    """Build grounded context from stored layers for a constellation."""
    from synth_engine.storage.models import (
        Constellation,
        ConstellationMember,
        ConstellationEdge,
        ConstellationRun,
    )

    context: Dict[str, Any] = {
        "constellation_id": constellation_id,
        "members": [],
        "edges": [],
        "layers": {},
        "runs": [],
    }

    # Load constellation metadata
    constellation = s.query(Constellation).filter(Constellation.id == constellation_id).first()
    if not constellation:
        return context

    context["name"] = constellation.name
    context["created_at"] = constellation.created_at.isoformat() if constellation.created_at else None

    # Load members with their profile data
    members = (
        s.query(ConstellationMember)
        .filter(ConstellationMember.constellation_id == constellation_id)
        .all()
    )
    for m in members:
        # Get profile info
        profile = s.query(Profile).filter(Profile.id == m.profile_id).first()
        member_ctx = {
            "profile_id": m.profile_id,
            "role": m.role,
            "meta": json.loads(m.meta_json) if m.meta_json else {},
        }
        if profile:
            try:
                member_ctx["person"] = json.loads(profile.person_json)
            except Exception:
                pass
            # Also get key layers for each member (minimal for AI context)
            for layer_name in ["natal_astro", "numerology", "humandesign"]:
                payload = R.latest_layer_payload(s, m.profile_id, layer_name)
                if payload:
                    member_ctx.setdefault("layers", {})[layer_name] = payload
        context["members"].append(member_ctx)

    # Load edges (relationships between members)
    edges = (
        s.query(ConstellationEdge)
        .filter(ConstellationEdge.constellation_id == constellation_id)
        .all()
    )
    for e in edges:
        context["edges"].append({
            "from_profile_id": e.from_profile_id,
            "to_profile_id": e.to_profile_id,
            "relationship": e.relationship,
            "meta": json.loads(e.meta_json) if e.meta_json else {},
        })

    # Load constellation-level computed layers
    for layer_name in ["bowen", "curriculum", "jung_summary", "constellation_graph"]:
        payload = R.latest_constellation_layer_payload(s, constellation_id, layer_name)
        if payload:
            context["layers"][layer_name] = payload

    # Load recent runs (for temporal context)
    runs = (
        s.query(ConstellationRun)
        .filter(ConstellationRun.constellation_id == constellation_id)
        .order_by(ConstellationRun.created_at.desc())
        .limit(3)
        .all()
    )
    for run in runs:
        context["runs"].append({
            "id": run.id,
            "as_of": run.as_of,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        })

    return context


def _get_citations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract citation metadata from context."""
    citations = []
    for layer_name, layer_data in context.get("layers", {}).items():
        if isinstance(layer_data, dict):
            citations.append({
                "layer": layer_name,
                "source": "computed_layer",
            })
    return citations


def _check_openai_configured():
    """Raise 501 if OpenAI is not configured."""
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=501,
            detail="AI synthesis is not yet enabled. Use /profiles/{id}/synthesis for deterministic insights.",
        )


def _call_llm(messages: List[Dict[str, str]], context: Dict[str, Any]) -> str:
    """Call the LLM with context. Returns assistant response."""
    # Note: caller should check _check_openai_configured() first
    try:
        import openai
        client = openai.OpenAI(api_key=settings.openai_api_key)

        # Build system prompt with grounded context
        system_prompt = """You are Defrag's synthesis assistant. You help users understand personal insights 
from computed layers: astrology, numerology, Human Design, Gene Keys, and psychological models.

TONE:
- Calm, grounded, precise
- No hype, no emojis, no therapy claims
- Explain *why* before *what*
- Short paragraphs, not essays
- Like a quiet expert, not a chatbot

RULES:
1. Only reference data provided in the context below
2. Cite which layer your insights come from
3. Never invent placements or interpretations not in the data
4. If asked about something not in context, say you don't have that information
5. Suggest where to look next, not what to feel

USER'S CONTEXT:
"""
        system_prompt += json.dumps(context, indent=2, default=str)

        full_messages = [{"role": "system", "content": system_prompt}] + messages

        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=full_messages,
            max_tokens=1000,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"LLM error: {e}", flush=True)
        traceback.print_exc()
        return f"Sorry, I encountered an error processing your request. Please try again."


def _truncate_to_preview(text: str, max_chars: int = 280) -> str:
    """
    Truncate text to approximately 2 sentences or max_chars, whichever is shorter.
    Tries to end at a sentence boundary.
    """
    if len(text) <= max_chars:
        return text
    
    # Find sentence boundaries within the limit
    sentence_endings = ['.', '!', '?']
    truncated = text[:max_chars]
    
    # Look for the last sentence ending
    last_end = -1
    for i, char in enumerate(truncated):
        if char in sentence_endings and i > 50:  # At least 50 chars
            last_end = i + 1
            # Check if we have ~2 sentences
            count = sum(1 for c in truncated[:i+1] if c in sentence_endings)
            if count >= 2:
                break
    
    if last_end > 50:
        return truncated[:last_end].strip()
    
    # Fall back to word boundary
    space_idx = truncated.rfind(' ')
    if space_idx > 50:
        return truncated[:space_idx].strip() + "..."
    
    return truncated.strip() + "..."


@router.post("/chat")
def chat(
    message: str,
    thread_id: Optional[str] = None,
    profile_id: Optional[str] = None,
    constellation_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    s: Session = Depends(db),
):
    """
    Send a message to the AI synthesis assistant.
    
    Access tiers:
    - Free: No access (402)
    - Insight/Integration: Preview mode (truncated response)
    - Constellation: Full mode
    
    - If thread_id is provided, continues an existing conversation
    - If profile_id is provided, context is loaded from that profile's layers
    - If constellation_id is provided, context is loaded from constellation layers
    
    Returns 503 if OpenAI is not configured.
    """
    # Check OpenAI is configured
    if not settings.openai_api_key:
        raise HTTPException(503, "AI not configured")
    
    # Determine access level based on plan
    plan = R.plan_for_user(s, user.id)
    is_paid = plan in ("insight", "integration", "constellation")
    is_full_access = plan == "constellation"
    
    # Free users cannot access AI at all
    if not is_paid:
        raise HTTPException(
            status_code=402,
            detail="AI synthesis requires a paid subscription. Visit /billing/checkout?price_tier=insight to subscribe.",
        )
    
    # Get or create thread
    if thread_id:
        thread = R.get_chat_thread(s, thread_id, user.id)
        if not thread:
            raise HTTPException(404, "Thread not found")
        # Use thread's profile/constellation if not overridden
        profile_id = profile_id or thread.profile_id
        constellation_id = constellation_id or thread.constellation_id
    else:
        thread = R.create_chat_thread(
            s,
            user_id=user.id,
            profile_id=profile_id,
            constellation_id=constellation_id,
            title=message[:50] + "..." if len(message) > 50 else message,
        )

    # Build context
    context: Dict[str, Any] = {}
    if profile_id:
        context = _build_context_for_profile(s, profile_id)
    elif constellation_id:
        context = _build_context_for_constellation(s, constellation_id)

    # Get conversation history
    history = R.get_chat_messages(s, thread.id, limit=20)
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    # Store user message
    R.add_chat_message(s, thread.id, "user", message)

    # Call LLM
    assistant_response = _call_llm(messages, context)
    citations = _get_citations(context)
    
    # Record usage (even for previews)
    R.record_usage(s, user.id, "ai_chat", units=1)

    # Apply preview truncation if not full access
    is_preview = not is_full_access
    displayed_response = assistant_response
    if is_preview:
        displayed_response = _truncate_to_preview(assistant_response)

    # Store the FULL assistant message (for continuity if they upgrade)
    R.add_chat_message(s, thread.id, "assistant", assistant_response, citations=citations)

    # Build response
    response = {
        "thread_id": thread.id,
        "message": {
            "role": "assistant",
            "content": displayed_response,
            "citations": citations,
        },
        "preview": is_preview,
    }
    
    if is_preview:
        response["upgrade_required"] = "constellation"
        response["preview_note"] = "This synthesis continues with relational context and pattern memory. Upgrade to Constellation to unlock the full view."
    
    return response


@router.get("/threads")
def list_threads(
    limit: int = 20,
    before_ts: Optional[str] = None,
    before_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    s: Session = Depends(db),
):
    """List chat threads for the authenticated user."""
    threads, next_ts, next_id = R.list_chat_threads(s, user.id, limit=limit, before_ts=before_ts, before_id=before_id)
    return {
        "threads": [
            {
                "id": t.id,
                "title": t.title,
                "profile_id": t.profile_id,
                "constellation_id": t.constellation_id,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in threads
        ],
        "next_before_ts": next_ts,
        "next_before_id": next_id,
    }


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: str,
    user: User = Depends(get_current_user),
    s: Session = Depends(db),
):
    """Get a chat thread with its messages."""
    thread = R.get_chat_thread(s, thread_id, user.id)
    if not thread:
        raise HTTPException(404, "Thread not found")

    messages = R.get_chat_messages(s, thread_id, limit=100)
    return {
        "id": thread.id,
        "title": thread.title,
        "profile_id": thread.profile_id,
        "constellation_id": thread.constellation_id,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": json.loads(m.citations_json) if m.citations_json else [],
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }

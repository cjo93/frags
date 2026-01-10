import asyncio
import json
import time
import uuid
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from synth_engine.agency.guardrails import (
    GuardrailContext,
    allowed_action_names,
)
from synth_engine.agency.pass_levels import PassLevel
from synth_engine.core.orchestrator import orchestrate
from synth_engine.core.spiral_store import append_spiral_event
from synth_engine.core.spiral_query import count_proposal_outcomes, query_spiral

router = APIRouter()

# in-memory cancellation tokens (MVP). Replace with Redis later if needed.
_CANCEL: Dict[str, asyncio.Event] = {}

# in-memory session metadata (MVP). Replace with Redis later if needed.
_SESSIONS: Dict[str, Dict[str, Any]] = {}


def chunk_text(text: str, size: int = 80):
    text = text or ""
    return [text[i : i + size] for i in range(0, len(text), size)]


def sse(event: str, data: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def sse_comment(comment: str) -> str:
    # Comment lines start with ':' and are ignored by EventSource but keep the stream alive.
    return f": {comment}\n\n"


def _parse_window_start_ts(w: dict) -> Optional[float]:
    """
    Accepts either:
    - start_ts: epoch seconds (int/float)
    - start: epoch seconds as string OR ISO8601 (best-effort)
    """
    if not isinstance(w, dict):
        return None
    if "start_ts" in w:
        try:
            return float(w["start_ts"])
        except Exception:
            return None
    if "start" in w:
        v = w["start"]
        # epoch as string/number
        try:
            return float(v)
        except Exception:
            pass
        # ISO8601 best-effort (avoid extra deps): accept YYYY-MM-DDTHH:MM:SSZ
        try:
            # minimal parse; if it fails, return None
            from datetime import datetime, timezone
            s = str(v).replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except Exception:
            return None
    return None


def has_near_term_kairotic_window(kairotic_windows: list, within_hours: float = 6.0) -> tuple:
    now = time.time()
    horizon = now + within_hours * 3600.0
    best = None
    best_ts = None

    for w in kairotic_windows or []:
        ts = _parse_window_start_ts(w)
        if ts is None:
            continue
        if now <= ts <= horizon:
            if best_ts is None or ts < best_ts:
                best_ts = ts
                best = w

    return (best is not None), best


def recently_handled_action(user_id: str, action: str, cooldown_minutes: int = 120) -> bool:
    """True if the user accepted/declined the same action within cooldown window."""
    lookback = cooldown_minutes * 60
    now = time.time()
    events, _ = query_spiral(user_id=user_id, kinds=["proposal_accepted", "proposal_declined"], limit=200)
    for rec in events:
        ts = rec.get("ts")
        if not ts:
            continue
        if now - float(ts) > lookback:
            break
        ev = (rec.get("event") or {})
        if ev.get("action") == action:
            return True
    return False


def dedupe_proposals(proposals: list) -> list:
    seen = set()
    out = []
    for p in proposals:
        a = p.get("action")
        if not a or a in seen:
            continue
        seen.add(a)
        out.append(p)
    return out


def build_action_proposals(result, user_id: str = "unknown") -> list:
    """
    Computed proposals grounded in orchestrator output.
    Must remain suggestions (never commands).
    Uses Spiral history to bias proposal frequency.
    """
    pass_level = result.pass_level
    proposals: list = []

    # PASSIVE: only play_audio + log_event
    if pass_level == PassLevel.PASSIVE:
        proposals.append({
            "action": "play_audio",
            "args": {"source": "briefing", "mode": "tts"},
            "requires_confirmation": False,
            "rationale": "Read the curriculum aloud to reduce load and stabilize.",
        })
        proposals.append({
            "action": "log_event",
            "args": {"kind": "passive_guidance_delivered"},
            "requires_confirmation": False,
            "rationale": "Log that passive guidance was delivered.",
        })
        return dedupe_proposals(proposals)

    # GUIDED/ACTIVE: safe navigation + audio + logging
    proposals += [
        {
            "action": "open_module",
            "args": {"route": "/field"},
            "requires_confirmation": False,
            "rationale": "Show relational field geometry.",
        },
        {
            "action": "play_audio",
            "args": {"source": "briefing", "mode": "tts"},
            "requires_confirmation": False,
            "rationale": "Read the curriculum aloud while you move through the day.",
        },
        {
            "action": "log_event",
            "args": {"kind": "briefing_completed"},
            "requires_confirmation": False,
            "rationale": "Log that the daily briefing finished.",
        },
    ]

    # Acceptance-weighted schedule horizon:
    # - declines > accepts => 2h
    # - accepts > declines => 8h
    # - otherwise => 6h
    outcomes = count_proposal_outcomes(user_id, "schedule_prompt", lookback=20)
    accepts = outcomes.get("accepts", 0)
    declines = outcomes.get("declines", 0)
    horizon_hours = 6.0
    if declines > accepts:
        horizon_hours = 2.0
    elif accepts > declines:
        horizon_hours = 8.0

    # Kairotic near-term window → propose schedule_prompt (ACTIVE only)
    near, w = has_near_term_kairotic_window(getattr(result, "kairotic_windows", []), within_hours=horizon_hours)
    if pass_level == PassLevel.ACTIVE and near and w:
        start_ts = _parse_window_start_ts(w) or 0.0
        very_soon = (start_ts > 0.0) and (start_ts - time.time() <= 60 * 60)

        # Cooldown: suppress repeats unless the window is very soon
        if (not very_soon) and recently_handled_action(user_id=user_id, action="schedule_prompt", cooldown_minutes=120):
            pass
        else:
            label = w.get("label") or w.get("name") or "kairotic_window"
            when = w.get("start") or w.get("start_ts") or "soon"
            proposals.append({
                "action": "schedule_prompt",
                "args": {"when": when, "label": label, "window": w},
                "requires_confirmation": True,
                "rationale": "A near-term kairotic window is coming up. Schedule a check-in.",
            })

    # General cooldown: suppress other repeated actions recently handled
    refined = []
    for p in proposals:
        a = p.get("action")
        if not a:
            continue
        if a in ("open_module", "play_audio", "log_event"):
            refined.append(p)
            continue
        if recently_handled_action(user_id=user_id, action=a, cooldown_minutes=120):
            continue
        refined.append(p)

    return dedupe_proposals(refined)


@router.post("/agent/session")
async def agent_session(request: Request):
    body = await request.json()
    user_id = body["user_id"]
    context = body.get("context", {})
    signals = body.get("signals", {})
    prompt = body.get("prompt", "")

    session_id = str(uuid.uuid4())
    cancel_evt = asyncio.Event()
    _CANCEL[session_id] = cancel_evt

    async def stream() -> AsyncGenerator[str, None]:
        try:
            # 1) compute deterministic truth first
            if await request.is_disconnected():
                yield sse("cancelled", {"session_id": session_id})
                return

            result = orchestrate(user_id=user_id, context=context, signals=signals, request_type="daily")

            yield sse(
                "session",
                {
                    "session_id": session_id,
                    "pass_level": str(result.pass_level),
                    "prompt": prompt,
                },
            )

            _SESSIONS[session_id] = {
                "user_id": user_id,
                "pass_level": str(result.pass_level),
                "created_at": asyncio.get_event_loop().time(),
            }

            # 2) stream narration text incrementally (placeholder until LLM wired)
            yield sse(
                "narration_start",
                {
                    "pass_level": str(result.pass_level),
                },
            )

            text = result.briefing.get("summary") or ""
            last_heartbeat = asyncio.get_event_loop().time()

            for chunk in chunk_text(text, 80):
                if cancel_evt.is_set() or await request.is_disconnected():
                    yield sse("cancelled", {"session_id": session_id})
                    return

                # heartbeat every ~15s to keep intermediaries from buffering/closing
                now = asyncio.get_event_loop().time()
                if now - last_heartbeat >= 15:
                    yield sse_comment("ping")
                    last_heartbeat = now

                yield sse("narration_chunk", {"text": chunk})
                await asyncio.sleep(0.05)

            yield sse("narration_end", {})

            # 3) propose actions (computed + allowlisted + logged)
            allow = set(allowed_action_names(result.pass_level))
            proposals = build_action_proposals(result, user_id=user_id)

            # log that proposals were offered (Spiral)
            try:
                append_spiral_event(user_id=user_id, event={
                    "kind": "proposals_offered",
                    "session_id": session_id,
                    "pass_level": str(result.pass_level),
                    "proposals": proposals,
                })
            except Exception:
                pass

            for p in proposals:
                if p["action"] in allow:
                    yield sse("action_proposal", p)

            yield sse("final", {"ok": True})
        finally:
            _CANCEL.pop(session_id, None)
            _SESSIONS.pop(session_id, None)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/agent/session")
async def agent_session_get(
    request: Request,
    user_id: str = Query(...),
    prompt: str = Query(""),
):
    context = {}
    signals = {}

    session_id = str(uuid.uuid4())
    cancel_evt = asyncio.Event()
    _CANCEL[session_id] = cancel_evt

    async def stream() -> AsyncGenerator[str, None]:
        try:
            result = orchestrate(user_id=user_id, context=context, signals=signals, request_type="daily")
            yield sse(
                "session",
                {"session_id": session_id, "pass_level": str(result.pass_level), "prompt": prompt},
            )

            _SESSIONS[session_id] = {
                "user_id": user_id,
                "pass_level": str(result.pass_level),
                "created_at": asyncio.get_event_loop().time(),
            }

            yield sse("narration_start", {"pass_level": str(result.pass_level)})

            text = result.briefing.get("summary") or ""
            last_heartbeat = asyncio.get_event_loop().time()

            for chunk in chunk_text(text, 80):
                if cancel_evt.is_set() or await request.is_disconnected():
                    yield sse("cancelled", {"session_id": session_id})
                    return

                now = asyncio.get_event_loop().time()
                if now - last_heartbeat >= 15:
                    yield sse_comment("ping")
                    last_heartbeat = now

                yield sse("narration_chunk", {"text": chunk})
                await asyncio.sleep(0.05)

            yield sse("narration_end", {})

            # 3) propose actions (computed + allowlisted + logged)
            allow = set(allowed_action_names(result.pass_level))
            proposals = build_action_proposals(result, user_id=user_id)

            # log that proposals were offered (Spiral)
            try:
                append_spiral_event(user_id=user_id, event={
                    "kind": "proposals_offered",
                    "session_id": session_id,
                    "pass_level": str(result.pass_level),
                    "proposals": proposals,
                })
            except Exception:
                pass

            for p in proposals:
                if p["action"] in allow:
                    yield sse("action_proposal", p)

            yield sse("final", {"ok": True})
        finally:
            _CANCEL.pop(session_id, None)
            _SESSIONS.pop(session_id, None)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agent/session/{session_id}/cancel")
async def cancel_session(session_id: str):
    evt = _CANCEL.get(session_id)
    if evt:
        evt.set()
        return {"ok": True}
    return {"ok": False, "error": "unknown_session"}

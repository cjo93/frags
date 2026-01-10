"""
Spiral Query: retrieval layer for agent recurrence.
MVP: file-based scan. Later: indexed DB or vector search.
"""
import json
import os
from typing import Any, Dict, Iterable, List, Optional, Tuple

_SPIRAL_PATH = os.getenv("DEFRAG_SPIRAL_PATH", "/Users/cjo/frags-1/.spiral_logs.jsonl")

# Known event kinds (for validation)
KNOWN_EVENT_KINDS = frozenset([
    "proposals_offered",
    "proposal_accepted",
    "proposal_declined",
    "schedule_prompt",
    "passive_guidance_delivered",
    "briefing_completed",
    "read_aloud_completed",
    "manual_test",
    "reflection",
])


def iter_spiral(limit: int = 2000) -> Iterable[Dict[str, Any]]:
    """Iterate over recent Spiral events (naive tail-read)."""
    if not os.path.exists(_SPIRAL_PATH):
        return []
    with open(_SPIRAL_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()[-limit:]
    out = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            continue
    return out


def query_spiral(
    user_id: str,
    kinds: Optional[List[str]] = None,
    limit: int = 200,
    cursor: Optional[float] = None,
) -> Tuple[List[Dict[str, Any]], Optional[float]]:
    """
    Query Spiral for events matching user_id and optionally kinds.
    Returns (events, next_cursor) where events are most recent first.
    cursor is a timestamp; returns events older than cursor.
    """
    kinds_set = set(kinds) if kinds else None
    results = []
    next_cursor = None
    
    for rec in reversed(list(iter_spiral(limit=5000))):
        ts = rec.get("ts", 0)
        
        # Skip events newer than cursor (for pagination)
        if cursor is not None and ts >= cursor:
            continue
            
        if rec.get("user_id") != user_id:
            continue
        ev = rec.get("event", {})
        if kinds_set and ev.get("kind") not in kinds_set:
            continue
        results.append(rec)
        
        if len(results) >= limit:
            # Set cursor for next page
            next_cursor = ts
            break
    
    return results, next_cursor


def validate_event_kind(kind: str) -> bool:
    """Check if event kind is known."""
    return kind in KNOWN_EVENT_KINDS


def count_proposal_outcomes(
    user_id: str,
    action: str,
    lookback: int = 10,
) -> Dict[str, int]:
    """
    Count accepts vs declines for a specific action in recent history.
    Used to bias future proposals.
    """
    accepts = 0
    declines = 0
    total = 0
    
    for rec in reversed(list(iter_spiral(limit=500))):
        if rec.get("user_id") != user_id:
            continue
        ev = rec.get("event", {})
        kind = ev.get("kind")
        ev_action = ev.get("action")
        
        if ev_action != action:
            continue
            
        if kind == "proposal_accepted":
            accepts += 1
            total += 1
        elif kind == "proposal_declined":
            declines += 1
            total += 1
        
        if total >= lookback:
            break
    
    return {"accepts": accepts, "declines": declines, "total": total}

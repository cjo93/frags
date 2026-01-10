"""
Spiral: Minimal event store for agent-generated logs.
MVP: append-only JSONL file. Later: D1/R2/Postgres.
"""
import json
import logging
import os
import time
from typing import Any, Dict

from synth_engine.core.spiral_query import KNOWN_EVENT_KINDS

_SPIRAL_PATH = os.getenv("DEFRAG_SPIRAL_PATH", "/Users/cjo/frags-1/.spiral_logs.jsonl")
_logger = logging.getLogger("synth_engine.spiral")


def append_spiral_event(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Append an event to the Spiral log.
    
    Args:
        user_id: User who generated the event
        event: Event payload (agent-generated data, must have 'kind')
    
    Returns:
        Complete record with timestamp
    
    Raises:
        ValueError: If event kind is unknown (unless it's a nested event like log_event args)
    """
    kind = event.get("kind")
    
    # Validate kind strictly - reject unknown kinds
    if kind and kind not in KNOWN_EVENT_KINDS:
        raise ValueError(f"Unknown event kind: {kind}. Known kinds: {sorted(KNOWN_EVENT_KINDS)}")
    
    rec = {
        "ts": time.time(),
        "user_id": user_id,
        "event": event,
    }
    
    # Ensure directory exists
    spiral_dir = os.path.dirname(_SPIRAL_PATH)
    if spiral_dir:
        os.makedirs(spiral_dir, exist_ok=True)
    
    with open(_SPIRAL_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    
    return rec

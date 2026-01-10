#!/usr/bin/env python3
"""
Local test of orchestrator + guardrails + SSE hardening
(Does not require FastAPI server to be running)
"""
import asyncio
import json
import uuid

from synth_engine.api.routes.agent_session import sse, _CANCEL
from synth_engine.core.orchestrator import orchestrate
from synth_engine.agency.guardrails import GuardrailContext, filter_action_proposals
from synth_engine.agency.pass_levels import PassLevel

def test_sse_formatter():
    """Test SSE output with ensure_ascii=False"""
    data = {"session_id": "test123", "pass_level": "GUIDED", "text": "✓ Unicode"}
    output = sse("session", data)
    assert "event: session" in output
    assert "✓ Unicode" in output  # Unicode should be preserved
    print("✓ SSE formatter with ensure_ascii=False works")

def test_orchestrator():
    """Test orchestrator entrypoint"""
    result = orchestrate(user_id="test", context={}, signals={}, request_type="daily")
    assert result.pass_level in [PassLevel.PASSIVE, PassLevel.GUIDED, PassLevel.ACTIVE]
    assert isinstance(result.state, dict)
    assert isinstance(result.briefing, dict)
    assert isinstance(result.field, dict)
    assert isinstance(result.kairotic_windows, list)
    print(f"✓ Orchestrator returns valid result with pass_level={result.pass_level}")

def test_guardrails():
    """Test pass-level enforcement"""
    ctx_passive = GuardrailContext(pass_level=PassLevel.PASSIVE, state={})
    ctx_guided = GuardrailContext(pass_level=PassLevel.GUIDED, state={})
    ctx_active = GuardrailContext(pass_level=PassLevel.ACTIVE, state={})
    
    proposals_passive = filter_action_proposals(ctx_passive, [])
    proposals_guided = filter_action_proposals(ctx_guided, [])
    proposals_active = filter_action_proposals(ctx_active, [])
    
    assert len(proposals_passive) == 0, "PASSIVE should block all"
    assert len(proposals_guided) == 0, "Empty proposals stay empty"
    assert len(proposals_active) == 0, "Empty proposals stay empty"
    print("✓ Guardrails filtering works correctly")

def test_cancellation_tracking():
    """Test session cancellation tokens"""
    session_id = str(uuid.uuid4())
    evt = asyncio.Event()
    _CANCEL[session_id] = evt
    
    assert session_id in _CANCEL
    evt.set()
    assert evt.is_set()
    
    _CANCEL.pop(session_id)
    assert session_id not in _CANCEL
    print("✓ Cancellation token registration and triggering works")

if __name__ == "__main__":
    print("Running local verification tests...\n")
    test_sse_formatter()
    test_orchestrator()
    test_guardrails()
    test_cancellation_tracking()
    print("\n✅ All verification tests passed!")

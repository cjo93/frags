"""Regression tests for Spiral storage and query layer."""

import os
import tempfile
import pytest
from unittest.mock import patch
from datetime import datetime, timezone

from synth_engine.core.spiral_store import append_spiral_event
from synth_engine.core.spiral_query import (
    query_spiral,
    count_proposal_outcomes,
    KNOWN_EVENT_KINDS,
    validate_event_kind,
)


@pytest.fixture
def temp_spiral_dir():
    """Create a temp directory for Spiral JSONL files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch.dict(os.environ, {"SPIRAL_DATA_DIR": tmpdir}):
            yield tmpdir


class TestSpiralStore:
    """Tests for append_spiral_event and basic storage."""

    def test_append_creates_file(self, temp_spiral_dir):
        """Appending an event creates the user's JSONL file."""
        user_id = "test-user-001"
        event = {"kind": "proposals_offered", "session_id": "s1", "proposals": []}
        
        result = append_spiral_event(user_id, event)
        
        assert result["ok"] is True
        assert "ts" in result
        assert os.path.exists(os.path.join(temp_spiral_dir, f"{user_id}.jsonl"))

    def test_append_known_kind_no_warning(self, temp_spiral_dir, caplog):
        """Known event kinds should not log a warning."""
        user_id = "test-user-002"
        for kind in KNOWN_EVENT_KINDS:
            append_spiral_event(user_id, {"kind": kind, "session_id": "s1"})
        
        # No warnings about unknown kinds
        assert "Unknown event kind" not in caplog.text

    def test_append_unknown_kind_raises(self, temp_spiral_dir):
        """Unknown event kinds should raise ValueError."""
        user_id = "test-user-003"
        
        with pytest.raises(ValueError, match="Unknown event kind"):
            append_spiral_event(user_id, {"kind": "totally_made_up", "session_id": "s1"})


class TestSpiralQuery:
    """Tests for query_spiral and pagination."""

    def test_query_returns_descending_order(self, temp_spiral_dir):
        """Events should be returned in descending timestamp order (newest first)."""
        user_id = "test-user-order"
        
        # Append events with slight delay simulation (use different timestamps)
        for i in range(5):
            append_spiral_event(user_id, {"kind": "proposal_accepted", "action": f"action_{i}", "session_id": "s1"})
        
        events, _ = query_spiral(user_id, limit=10)
        
        assert len(events) == 5
        # Verify descending order
        for i in range(len(events) - 1):
            assert events[i]["ts"] >= events[i + 1]["ts"]

    def test_query_respects_limit(self, temp_spiral_dir):
        """Limit parameter should cap returned events."""
        user_id = "test-user-limit"
        
        for i in range(20):
            append_spiral_event(user_id, {"kind": "proposal_accepted", "action": f"action_{i}", "session_id": "s1"})
        
        events, next_cursor = query_spiral(user_id, limit=5)
        
        assert len(events) == 5
        assert next_cursor is not None

    def test_query_filters_by_kind(self, temp_spiral_dir):
        """Query should filter by event kind."""
        user_id = "test-user-filter"
        
        append_spiral_event(user_id, {"kind": "proposal_accepted", "action": "a1", "session_id": "s1"})
        append_spiral_event(user_id, {"kind": "proposal_declined", "action": "a2", "session_id": "s1"})
        append_spiral_event(user_id, {"kind": "proposal_accepted", "action": "a3", "session_id": "s1"})
        
        accepted, _ = query_spiral(user_id, kinds=["proposal_accepted"], limit=10)
        declined, _ = query_spiral(user_id, kinds=["proposal_declined"], limit=10)
        
        assert len(accepted) == 2
        assert len(declined) == 1
        assert all(e["event"]["kind"] == "proposal_accepted" for e in accepted)
        assert all(e["event"]["kind"] == "proposal_declined" for e in declined)

    def test_cursor_pagination(self, temp_spiral_dir):
        """Cursor should allow paginating through events."""
        user_id = "test-user-cursor"
        
        for i in range(10):
            append_spiral_event(user_id, {"kind": "proposal_accepted", "action": f"action_{i}", "session_id": "s1"})
        
        # First page
        page1, cursor1 = query_spiral(user_id, limit=4)
        assert len(page1) == 4
        assert cursor1 is not None
        
        # Second page using cursor
        page2, cursor2 = query_spiral(user_id, limit=4, cursor=cursor1)
        assert len(page2) == 4
        assert cursor2 is not None
        
        # Third page (should have remaining 2)
        page3, cursor3 = query_spiral(user_id, limit=4, cursor=cursor2)
        assert len(page3) == 2
        assert cursor3 is None  # No more pages
        
        # Verify no overlap
        all_ts = [e["ts"] for e in page1 + page2 + page3]
        assert len(all_ts) == len(set(all_ts))  # All unique


class TestProposalOutcomes:
    """Tests for count_proposal_outcomes used in behavioral recurrence."""

    def test_count_proposal_outcomes_basic(self, temp_spiral_dir):
        """Count should tally accepted/declined for specific action."""
        user_id = "test-user-outcomes"
        
        # 3 accepts, 2 declines for schedule_prompt
        for _ in range(3):
            append_spiral_event(user_id, {"kind": "proposal_accepted", "action": "schedule_prompt", "session_id": "s1"})
        for _ in range(2):
            append_spiral_event(user_id, {"kind": "proposal_declined", "action": "schedule_prompt", "session_id": "s1"})
        
        # 1 accept for different action
        append_spiral_event(user_id, {"kind": "proposal_accepted", "action": "play_audio", "session_id": "s1"})
        
        counts = count_proposal_outcomes(user_id, action="schedule_prompt", lookback_hours=24)
        
        assert counts["accepted"] == 3
        assert counts["declined"] == 2

    def test_count_proposal_outcomes_affects_bias(self, temp_spiral_dir):
        """Verify decline-heavy history would trigger schedule horizon reduction."""
        user_id = "test-user-bias"
        
        # 1 accept, 4 declines → should trigger bias (declines > 2 * accepts)
        append_spiral_event(user_id, {"kind": "proposal_accepted", "action": "schedule_prompt", "session_id": "s1"})
        for _ in range(4):
            append_spiral_event(user_id, {"kind": "proposal_declined", "action": "schedule_prompt", "session_id": "s1"})
        
        counts = count_proposal_outcomes(user_id, action="schedule_prompt", lookback_hours=24)
        
        # This is the condition checked in agent_session.py for biasing horizon
        should_reduce_horizon = counts["declined"] > counts["accepted"] * 2
        assert should_reduce_horizon is True


class TestEventKindValidation:
    """Tests for KNOWN_EVENT_KINDS and validate_event_kind."""

    def test_known_kinds_are_complete(self):
        """Ensure all expected event kinds are in KNOWN_EVENT_KINDS."""
        expected = {
            "proposals_offered",
            "proposal_accepted", 
            "proposal_declined",
            "schedule_prompt",
            "passive_guidance_delivered",
            "briefing_completed",
        }
        assert expected.issubset(KNOWN_EVENT_KINDS)

    def test_validate_event_kind_known(self):
        """validate_event_kind returns True for known kinds."""
        for kind in KNOWN_EVENT_KINDS:
            assert validate_event_kind(kind) is True

    def test_validate_event_kind_unknown(self):
        """validate_event_kind returns False for unknown kinds."""
        assert validate_event_kind("totally_unknown") is False
        assert validate_event_kind("") is False
        assert validate_event_kind("PROPOSALS_OFFERED") is False  # case-sensitive

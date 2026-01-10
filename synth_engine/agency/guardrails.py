from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from synth_engine.agency.pass_levels import PassLevel
from synth_engine.agency.action_schema import ActionProposal


@dataclass
class GuardrailContext:
    pass_level: PassLevel
    state: Dict[str, Any]


def allowed_action_names(pass_level: PassLevel) -> List[str]:
    # PASSIVE: allow only read-aloud and safe logging
    if pass_level == PassLevel.PASSIVE:
        return ["play_audio", "log_event"]

    # GUIDED: navigation + read-aloud + logging
    if pass_level == PassLevel.GUIDED:
        return ["open_module", "play_audio", "log_event"]

    # ACTIVE: add imports + scheduling (still confirmed)
    return ["open_module", "play_audio", "log_event", "schedule_prompt", "import_gedcom", "import_csv", "preview_mesh"]


def filter_action_proposals(ctx: GuardrailContext, proposals: List[ActionProposal]) -> List[ActionProposal]:
    allow = set(allowed_action_names(ctx.pass_level))
    return [p for p in proposals if p.action in allow]


def validate_and_filter_actions(
    ctx: GuardrailContext,
    proposals: list[ActionProposal],
) -> list[ActionProposal]:
    allowed = set(allowed_action_names(ctx.pass_level))

    safe: list[ActionProposal] = []
    for proposal in proposals:
        if proposal.action not in allowed:
            continue
        safe.append(proposal)

    return safe

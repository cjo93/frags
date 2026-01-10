from dataclasses import dataclass
from typing import Any, Dict, Literal


ActionType = Literal[
    "open_module",
    "play_audio",
    "log_event",
    "schedule_prompt",
    "import_gedcom",
    "import_csv",
    "preview_mesh",
]


@dataclass
class ActionProposal:
    action: ActionType
    args: Dict[str, Any]
    requires_confirmation: bool = True
    rationale: str = ""

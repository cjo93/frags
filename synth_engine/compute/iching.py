from __future__ import annotations
from typing import Dict, Any, List, Optional
from synth_engine.utils.hashing import sha256_inputs

def iching_consult(question: str, method: str="coins", primary_hex: int=1, changing_lines: Optional[List[int]]=None) -> Dict[str,Any]:
    changing_lines = changing_lines or []
    return {
        "mode": "consult",
        "question": question,
        "method": method,
        "primary_hex": primary_hex,
        "changing_lines": changing_lines,
        "resulting_hex": primary_hex,
        "inputs_hash": sha256_inputs({"q":question,"m":method,"h":primary_hex,"cl":changing_lines}),
    }

def iching_derived(payload: Dict[str,Any]) -> Dict[str,Any]:
    return {"mode":"derived","payload":payload,"inputs_hash": sha256_inputs(payload)}

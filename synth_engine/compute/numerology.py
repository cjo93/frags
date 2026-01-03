from __future__ import annotations
from typing import Dict, Any, Optional
from synth_engine.utils.hashing import sha256_inputs

def digit_sum(n: int) -> int:
    return sum(int(c) for c in str(abs(n)))

def reduce_num(n: int, keep_master=True) -> int:
    while n > 9:
        if keep_master and n in (11,22,33):
            return n
        n = digit_sum(n)
    return n

def life_path(date_yyyy_mm_dd: str) -> int:
    y, m, d = date_yyyy_mm_dd.split("-")
    total = sum(int(c) for c in (y+m+d))
    return reduce_num(total, keep_master=True)

def numerology_compute(date_yyyy_mm_dd: str, name_at_birth: Optional[str]=None, system: str="pythagorean") -> Dict[str,Any]:
    out = {"life_path": life_path(date_yyyy_mm_dd)}
    return {"system": system, "values": out, "inputs_hash": sha256_inputs({"date":date_yyyy_mm_dd,"name":name_at_birth,"system":system})}

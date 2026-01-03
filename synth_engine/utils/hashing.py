import hashlib, json
from typing import Any

def sha256_inputs(obj: Any) -> str:
    b = json.dumps(obj, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(b).hexdigest()

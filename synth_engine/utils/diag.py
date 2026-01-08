from __future__ import annotations

import hashlib
from typing import Optional, Union


def secret_fingerprint(secret: Optional[Union[str, bytes]]) -> Optional[str]:
    if not secret:
        return None
    data = secret.encode("utf-8") if isinstance(secret, str) else secret
    return hashlib.sha256(data).hexdigest()[:12]

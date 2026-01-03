from __future__ import annotations

from dataclasses import dataclass
from time import monotonic
from typing import Dict, Tuple


@dataclass
class Bucket:
    capacity: float
    refill_per_sec: float
    tokens: float
    last: float


class TokenBucketLimiter:
    def __init__(self) -> None:
        self.buckets: Dict[Tuple[str, str], Bucket] = {}

    def allow(self, key: Tuple[str, str], capacity: int, refill_per_sec: float, cost: float = 1.0) -> bool:
        now = monotonic()
        b = self.buckets.get(key)
        if b is None:
            b = Bucket(capacity=float(capacity), refill_per_sec=float(refill_per_sec), tokens=float(capacity), last=now)
            self.buckets[key] = b

        elapsed = max(0.0, now - b.last)
        b.last = now
        b.tokens = min(b.capacity, b.tokens + elapsed * b.refill_per_sec)

        if b.tokens >= cost:
            b.tokens -= cost
            return True
        return False


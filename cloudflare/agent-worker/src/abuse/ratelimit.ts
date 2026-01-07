type Bucket = { tokens: number; lastRefillMs: number };

export class TokenBucket {
  private buckets = new Map<string, Bucket>();

  constructor(private capacity: number, private refillPerSec: number) {}

  allow(key: string): { ok: boolean; retryAfterSec: number } {
    const now = Date.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, lastRefillMs: now };

    // refill
    const elapsedSec = (now - b.lastRefillMs) / 1000;
    const refill = elapsedSec * this.refillPerSec;
    b.tokens = Math.min(this.capacity, b.tokens + refill);
    b.lastRefillMs = now;

    if (b.tokens >= 1) {
      b.tokens -= 1;
      this.buckets.set(key, b);
      return { ok: true, retryAfterSec: 0 };
    }

    this.buckets.set(key, b);
    const deficit = 1 - b.tokens;
    const retryAfterSec = Math.max(1, Math.ceil(deficit / this.refillPerSec));
    return { ok: false, retryAfterSec };
  }
}

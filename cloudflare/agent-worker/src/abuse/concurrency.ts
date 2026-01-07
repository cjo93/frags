export class ConcurrencyLimiter {
  private inFlight = new Map<string, number>();

  acquire(key: string, max: number): boolean {
    const cur = this.inFlight.get(key) ?? 0;
    if (cur >= max) return false;
    this.inFlight.set(key, cur + 1);
    return true;
  }

  release(key: string): void {
    const cur = this.inFlight.get(key) ?? 0;
    const next = Math.max(0, cur - 1);
    if (next === 0) this.inFlight.delete(key);
    else this.inFlight.set(key, next);
  }
}

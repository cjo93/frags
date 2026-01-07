import { LIMITS } from "./limits";
import { TokenBucket } from "./ratelimit";
import { ConcurrencyLimiter } from "./concurrency";

const chatBucket = new TokenBucket(LIMITS.chat.ratePerMin, LIMITS.chat.ratePerMin / 60);
const toolBucket = new TokenBucket(LIMITS.tool.ratePerMin, LIMITS.tool.ratePerMin / 60);
const ipBucket = new TokenBucket(LIMITS.globalIp.ratePerMin, LIMITS.globalIp.ratePerMin / 60);

const conc = new ConcurrencyLimiter();

export function enforceRateAndConcurrency(params: {
  endpoint: "chat" | "tool";
  userId: string;
  ip: string;
  isDevAdmin: boolean;
}): { ok: true; releaseKey: string } | { ok: false; response: Response } {
  // Dev admin bypasses rate/concurrency (still subject to size validation upstream)
  if (params.isDevAdmin) return { ok: true, releaseKey: "" };

  const ipRes = ipBucket.allow(`ip:${params.ip}`);
  if (!ipRes.ok) {
    return {
      ok: false,
      response: new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": String(ipRes.retryAfterSec) }
      })
    };
  }

  const bucket = params.endpoint === "chat" ? chatBucket : toolBucket;
  const rateRes = bucket.allow(`user:${params.userId}:${params.endpoint}`);
  if (!rateRes.ok) {
    return {
      ok: false,
      response: new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": String(rateRes.retryAfterSec) }
      })
    };
  }

  const maxConc = params.endpoint === "chat" ? LIMITS.chat.concurrency : LIMITS.tool.concurrency;
  const concKey = `user:${params.userId}:${params.endpoint}`;
  const acquired = conc.acquire(concKey, maxConc);
  if (!acquired) {
    return {
      ok: false,
      response: new Response("Too Many Requests", { status: 429, headers: { "retry-after": "1" } })
    };
  }

  return { ok: true, releaseKey: concKey };
}

export function releaseConcurrency(key: string): void {
  if (!key) return;
  conc.release(key);
}

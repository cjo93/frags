/// <reference types="vitest" />
import crypto from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { getOrCreateEphemeris } from "@/lib/ephemeris/cache";
import { buildEphemerisRequest } from "@/lib/horizons";

const store = {
  requests: [] as any[],
  caches: [] as any[]
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ephemerisRequest: {
      findUnique: ({ where, include }: any) => {
        const req = store.requests.find((r) => r.cacheKey === where.cacheKey);
        if (!req) return null;
        if (include?.cache) {
          const cache = store.caches.find((c) => c.ephemerisRequestId === req.id);
          return { ...req, cache };
        }
        return req;
      },
      upsert: ({ where, create }: any) => {
        const existing = store.requests.find((r) => r.cacheKey === where.cacheKey);
        if (existing) return existing;
        const record = { id: crypto.randomUUID(), cacheKey: where.cacheKey, ...create };
        store.requests.push(record);
        return record;
      }
    },
    ephemerisCache: {
      create: ({ data }: any) => {
        const record = { id: crypto.randomUUID(), ...data };
        store.caches.push(record);
        return record;
      }
    }
  }
}));

describe("Ephemeris cache", () => {
  beforeEach(() => {
    process.env.HORIZONS_MODE = "fixtures";
    store.requests.length = 0;
    store.caches.length = 0;
  });

  const input = {
    target: "sun",
    observer: { kind: "GEOCENTER" } as const,
    start: "2020-01-01T00:00:00Z",
    stop: "2020-01-01T02:00:00Z",
    step: "1h",
    quantities: [1, 2]
  };

  it("reuses cache for identical requests", async () => {
    const first = await getOrCreateEphemeris(input);
    expect(first.fromCache).toBe(false);
    expect(store.requests).toHaveLength(1);
    expect(store.caches).toHaveLength(1);

    const second = await getOrCreateEphemeris(input);
    expect(second.fromCache).toBe(true);
    expect(second.cacheKey).toBe(first.cacheKey);
    expect(second.canonicalHash).toBe(first.canonicalHash);
    expect(store.requests).toHaveLength(1);
    expect(store.caches).toHaveLength(1);
  });

  it("creates a new cache entry when request changes", async () => {
    const baseReq = { ...input };
    const first = await getOrCreateEphemeris(baseReq);
    const modified = await getOrCreateEphemeris({ ...input, start: "2020-01-02T00:00:00Z" });

    expect(modified.cacheKey).not.toBe(first.cacheKey);
    expect(modified.fromCache).toBe(false);
    expect(store.requests).toHaveLength(2);
    expect(store.caches).toHaveLength(2);
  });

  it("builds deterministic requests", () => {
    const a = buildEphemerisRequest({ ...input, quantities: [2, 1] });
    const b = buildEphemerisRequest({ ...input, quantities: [1, 2] });
    expect(a.quantities).toEqual([1, 2]);
    expect(b.quantities).toEqual([1, 2]);
  });
});

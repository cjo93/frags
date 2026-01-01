/// <reference types="vitest" />
import crypto from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/compute/route";

type ProfileRecord = {
  id: string;
  userId: string;
  birthData?: any;
};

const demoUser = "demo-user";

let store: {
  profiles: ProfileRecord[];
  computeRuns: any[];
  artifacts: any[];
};

vi.mock("@/lib/auth/session", () => ({
  requireUserId: () => demoUser
}));

vi.mock("@/lib/billing/entitlement", () => ({
  requireEntitledUser: () => undefined
}));

const ephemerisMock = vi.fn(async (_input?: unknown) => ({
  cacheKey: "cache-1",
  canonicalHash: "hash-1",
  canonicalJson: { formatVersion: "1", points: [] },
  rawText: "raw",
  fromCache: false
}));

vi.mock("@/lib/ephemeris/cache", () => ({
  getOrCreateEphemeris: (input: unknown) => ephemerisMock(input)
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findFirst: ({ where }: any) =>
        store.profiles.find((p) => p.id === where.id && p.userId === where.userId) ?? null,
      findUnique: ({ where }: any) => store.profiles.find((p) => p.id === where.id) ?? null
    },
    computeRun: {
      findUnique: ({ where, include }: any) => {
        const run =
          store.computeRuns.find(
            (r) =>
              r.profileId === where.profileId_engineVersion_inputsHash.profileId &&
              r.engineVersion === where.profileId_engineVersion_inputsHash.engineVersion &&
              r.inputsHash === where.profileId_engineVersion_inputsHash.inputsHash
          ) ?? null;
        if (!run) return null;
        const artifacts = include?.artifacts
          ? store.artifacts.filter(
              (a) =>
                a.computeRunId === run.id &&
                (!include.artifacts.where ||
                  (include.artifacts.where.kind === undefined ||
                    a.kind === include.artifacts.where.kind) &&
                    (include.artifacts.where.schemaVersion === undefined ||
                      a.schemaVersion === include.artifacts.where.schemaVersion))
            )
          : [];
        return { ...run, artifacts };
      },
      upsert: ({ where, create, update }: any) => {
        const existing = store.computeRuns.find(
          (r) =>
            r.profileId === where.profileId_engineVersion_inputsHash.profileId &&
            r.engineVersion === where.profileId_engineVersion_inputsHash.engineVersion &&
            r.inputsHash === where.profileId_engineVersion_inputsHash.inputsHash
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        store.computeRuns.push({ ...create, id: create.id ?? crypto.randomUUID(), artifacts: [] });
        return store.computeRuns[store.computeRuns.length - 1];
      },
      update: ({ where, data }: any) => {
        const match = store.computeRuns.find((r) => r.id === where.id);
        Object.assign(match, data);
        return match;
      }
    },
    computeArtifact: {
      upsert: ({ where, create, update }: any) => {
        const existing = store.artifacts.find(
          (a) =>
            a.computeRunId === where.computeRunId_kind_schemaVersion.computeRunId &&
            a.kind === where.computeRunId_kind_schemaVersion.kind &&
            a.schemaVersion === where.computeRunId_kind_schemaVersion.schemaVersion
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        store.artifacts.push({ ...create, id: create.id ?? crypto.randomUUID() });
        return store.artifacts[store.artifacts.length - 1];
      }
    }
  }
}));

describe("compute API", () => {
  beforeEach(() => {
    store = {
      profiles: [
        {
          id: "profile-1",
          userId: demoUser,
          birthData: {
            date: new Date("1990-01-01T00:00:00Z"),
            tzIana: "UTC",
            latitude: 1,
            longitude: 2,
            altitude: 3,
            fidelity: "HIGH"
          }
        }
      ],
      computeRuns: [],
      artifacts: []
    };
    ephemerisMock.mockClear();
  });

  it("returns cached artifact on repeat call", async () => {
    const body = { profileId: "profile-1", engineVersion: "1.0.0", options: { mode: "a" } };

    const req1 = new Request("http://localhost/api/compute", {
      method: "POST",
      body: JSON.stringify(body)
    });
    const res1 = await POST(req1);
    const json1 = await res1.json();

    const req2 = new Request("http://localhost/api/compute", {
      method: "POST",
      body: JSON.stringify(body)
    });
    const res2 = await POST(req2);
    const json2 = await res2.json();

    expect(json1.cached).toBe(false);
    expect(json2.cached).toBe(true);
    expect(json2.computeRunId).toBe(json1.computeRunId);
    expect(json1.artifact).toEqual(json2.artifact);
    expect(json1.artifact.ephemeris.cacheKey).toBe("cache-1");
  });

  it("creates new run when options change", async () => {
    const base = { profileId: "profile-1", engineVersion: "1.0.0" };

    const req1 = new Request("http://localhost/api/compute", {
      method: "POST",
      body: JSON.stringify({ ...base, options: { mode: "a" } })
    });
    const res1 = await POST(req1);
    const json1 = await res1.json();

    const req2 = new Request("http://localhost/api/compute", {
      method: "POST",
      body: JSON.stringify({ ...base, options: { mode: "b" } })
    });
    const res2 = await POST(req2);
    const json2 = await res2.json();

    expect(json1.computeRunId).not.toBe(json2.computeRunId);
    expect(json1.artifact.inputsHash).not.toBe(json2.artifact.inputsHash);
  });

  it("includes ephemeris payload in artifact", async () => {
    const req = new Request("http://localhost/api/compute", {
      method: "POST",
      body: JSON.stringify({ profileId: "profile-1", engineVersion: "1.0.0" })
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.artifact.ephemeris).toBeDefined();
    expect(json.artifact.ephemeris.cacheKey).toBe("cache-1");
    expect(json.artifact.ephemeris.canonical).toEqual({ formatVersion: "1", points: [] });
  });
});

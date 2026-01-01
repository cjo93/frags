/// <reference types="vitest" />
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

const queryRawMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: any[]) => queryRawMock(...args)
  }
}));

describe("health endpoint", () => {
  it("returns ok when DB responds", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "ok" });
  });

  it("returns fail when DB errors", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: "fail" });
  });
});

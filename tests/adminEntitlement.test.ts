/// <reference types="vitest" />
import { describe, expect, it, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/admin/entitlement/route";

const adminUserId = "admin-1";

let updated: { id: string; subscriptionStatus: string } | null = null;

vi.mock("@/lib/auth/session", () => ({
  requireUserId: () => adminUserId
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: ({ where, data }: any) => {
        updated = { id: where.id, subscriptionStatus: data.subscriptionStatus };
        return updated;
      }
    }
  }
}));

describe("admin entitlement route", () => {
  beforeEach(() => {
    updated = null;
    delete process.env.ENABLE_ADMIN_ENTITLEMENT;
    delete process.env.ENTITLEMENT_ADMIN_IDS;
  });

  it("returns 404 when feature flag off", async () => {
    process.env.ENABLE_ADMIN_ENTITLEMENT = "false";
    process.env.ENTITLEMENT_ADMIN_IDS = adminUserId;

    const req = new Request("http://localhost/api/admin/entitlement", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", subscriptionStatus: "ACTIVE" })
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    process.env.ENABLE_ADMIN_ENTITLEMENT = "true";
    process.env.ENTITLEMENT_ADMIN_IDS = "someone-else";

    const req = new Request("http://localhost/api/admin/entitlement", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", subscriptionStatus: "ACTIVE" })
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("updates subscriptionStatus when enabled + admin", async () => {
    process.env.ENABLE_ADMIN_ENTITLEMENT = "true";
    process.env.ENTITLEMENT_ADMIN_IDS = adminUserId;

    const req = new Request("http://localhost/api/admin/entitlement", {
      method: "POST",
      body: JSON.stringify({ userId: "target-1", subscriptionStatus: "TRIALING" })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toEqual({ ok: true, userId: "target-1", subscriptionStatus: "TRIALING" });
    expect(updated).toEqual({ id: "target-1", subscriptionStatus: "TRIALING" });
  });
});

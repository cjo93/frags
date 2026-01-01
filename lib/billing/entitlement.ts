import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";

export type BillingMode = "off" | "allowlist" | "db";

function getBillingMode(): BillingMode {
  const raw = (process.env.BILLING_MODE ?? "").trim().toLowerCase();
  if (raw === "off" || raw === "allowlist" || raw === "db") return raw;

  // Safe default: require gating in production, allow in dev/test unless explicitly enabled.
  return process.env.NODE_ENV === "production" ? "allowlist" : "off";
}

function parseAllowlist(): string[] {
  return (process.env.ENTITLED_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function requireEntitledUser(userId: string) {
  const mode = getBillingMode();
  if (mode === "off") return;

  if (mode === "allowlist") {
    const allowed = parseAllowlist();
    if (allowed.includes(userId)) return;
    throw new HttpError(402, "Subscription required");
  }

  // mode === "db"
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true }
  });

  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (user.subscriptionStatus === "ACTIVE" || user.subscriptionStatus === "TRIALING") return;

  throw new HttpError(402, "Subscription required");
}

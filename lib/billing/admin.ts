import { HttpError } from "@/lib/http";
import { requireUserId } from "@/lib/auth/session";

function parseAdminAllowlist(): string[] {
  return (process.env.ENTITLEMENT_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function requireAdminUserId() {
  const userId = await requireUserId();
  const admins = parseAdminAllowlist();

  if (!admins.includes(userId)) {
    throw new HttpError(403, "Forbidden");
  }

  return userId;
}

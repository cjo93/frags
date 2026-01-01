import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/billing/admin";
import { HttpError, getErrorMessage } from "@/lib/http";

const subscriptionStatusSchema = z.enum(["ACTIVE", "TRIALING", "INACTIVE", "CANCELED"]);

const bodySchema = z.object({
  userId: z.string().min(1),
  subscriptionStatus: subscriptionStatusSchema
});

function isEnabled() {
  return (process.env.ENABLE_ADMIN_ENTITLEMENT ?? "").toLowerCase() === "true";
}

export async function POST(req: Request) {
  if (!isEnabled()) {
    // Hide the existence of the endpoint unless explicitly enabled.
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const actorId = await requireAdminUserId();

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, subscriptionStatus } = parsed.data;

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus }
    });

    console.info("admin_entitlement_update", {
      actorId,
      targetUserId: userId,
      subscriptionStatus
    });

    return NextResponse.json({ ok: true, userId, subscriptionStatus });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json(
      { message: getErrorMessage(error, "Unable to update entitlement") },
      { status }
    );
  }
}

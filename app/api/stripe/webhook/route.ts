import { NextResponse } from "next/server";
import { stripeWebhookSecret } from "@/lib/stripe/server";

export async function POST(request: Request) {
  if (!stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature") || "";
  const payload = await request.text();

  try {
    stripeWebhookSecret; // placeholder for hooking in Stripe
    // TODO: verify signature with Stripe's library once secret is available
    return NextResponse.json({ message: "Webhook stub received" });
  } catch (error) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "STRIPE_SECRET_KEY is not set, Stripe integrations will stay offline until you configure the env."
  );
}

export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2022-11-15"
    })
  : null;

export function getStripeClient() {
  if (!stripeClient) {
    throw new Error("Missing STRIPE_SECRET_KEY for Stripe client instantiation.");
  }

  return stripeClient;
}

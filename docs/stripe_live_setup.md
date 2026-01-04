# Stripe Live Setup Guide

This guide covers setting up Stripe in **Live Mode** for production billing.

---

## Prerequisites

- Stripe account activated for Live mode
- Access to Render dashboard for env vars
- Admin JWT to test `/billing/debug`

---

## Step 1: Create Products & Prices in Stripe Dashboard

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. **Ensure you're in Live mode** (toggle in top-left)
3. Create 3 products:

| Product Name | Price | Billing | Notes |
|-------------|-------|---------|-------|
| Basic | $9/mo | Recurring/Monthly | Profile compute, 1 profile |
| Pro | $19/mo | Recurring/Monthly | Unlimited profiles |
| Family | $29/mo | Recurring/Monthly | Constellations, family features |

4. After creating each, copy the **Price ID** (starts with `price_`)

---

## Step 2: Create Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Configure:
   - **Endpoint URL**: `https://api.defrag.app/billing/webhook`
   - **Events to listen for**:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `checkout.session.completed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)

---

## Step 3: Set Environment Variables in Render

Go to Render → Your Service → Environment and add:

```
SYNTH_STRIPE_SECRET_KEY=sk_live_...
SYNTH_STRIPE_WEBHOOK_SECRET=whsec_...
SYNTH_STRIPE_PRICE_BASIC=price_...
SYNTH_STRIPE_PRICE_PRO=price_...
SYNTH_STRIPE_PRICE_FAMILY=price_...
SYNTH_APP_BASE_URL=https://defrag.app
SYNTH_API_BASE_URL=https://api.defrag.app
```

**Note**: All settings use `SYNTH_` prefix.

---

## Step 4: Verify Configuration

After deploying, test with an admin JWT:

```bash
curl -H "Authorization: Bearer $ADMIN_JWT" \
  https://api.defrag.app/billing/debug
```

Expected response:
```json
{
  "billing_enabled": true,
  "prices_present": {
    "basic": true,
    "pro": true,
    "family": true
  },
  "all_prices_configured": true,
  "webhook_configured": true,
  "current_user_plan": "free",
  "active_subscription_status": null,
  "price_id": null
}
```

---

## Endpoint Tier Requirements

| Endpoint | Min Plan | HTTP 402 if below |
|----------|----------|-------------------|
| `POST /profiles/{id}/compute_reading` | basic | Yes |
| `POST /constellations/{id}/compute` | family | Yes |
| `POST /ai/chat` | admin-only | 403 |
| `POST /profiles/{id}/synthesis` | free | No |
| `POST /constellations/{id}/synthesis` | free | No |

---

## Checkout Flow

1. User calls `POST /billing/checkout?price_tier=basic`
2. API creates Stripe Checkout session, returns `{url: "https://checkout.stripe.com/..."}`
3. User completes payment on Stripe
4. Stripe sends webhook to `/billing/webhook`
5. API updates subscription in DB
6. User's plan changes, gated endpoints unlock

---

## Troubleshooting

### "Billing not configured" (503)
- `SYNTH_STRIPE_SECRET_KEY` not set or empty

### "Tier not configured" (400)
- The requested tier's price ID is missing
- Check `SYNTH_STRIPE_PRICE_BASIC`, etc.

### "Webhook not configured" (503)
- `SYNTH_STRIPE_WEBHOOK_SECRET` not set

### "Invalid signature" (400) on webhook
- Wrong webhook secret
- Webhook URL mismatch (http vs https)

### Plan not updating after payment
- Check webhook is receiving events in Stripe Dashboard
- Verify customer was created and linked to user
- Check `/billing/debug` for subscription status

---

## Testing in Live Mode

**Important**: Use real cards in Live mode. For testing:
1. Start with your own card
2. Cancel subscription immediately after testing
3. Use Stripe's test clock feature for time-based testing

---

## Security Notes

- Never commit secrets to git
- Use Render environment variables only
- `/billing/debug` is admin-only (won't expose secrets)
- Webhook validates signatures before processing

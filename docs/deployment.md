# Deployment & Billing Guide

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Vercel    │────▶│  Render (API)    │────▶│   Neon DB   │
│  Frontend   │     │  api.defrag.app  │     │  Postgres   │
└─────────────┘     └──────────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │     Stripe       │
                    │   (Billing)      │
                    └──────────────────┘
```

## Environment Variables

### Required (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `SYNTH_DATABASE_URL` | Neon Postgres connection string | `postgresql+psycopg://...?sslmode=require` |
| `SYNTH_JWT_SECRET` | JWT signing secret (auto-generated if not set) | random 32+ chars |
| `SYNTH_JWT_ALGORITHM` | JWT algorithm | `HS256` |

### Stripe (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `SYNTH_STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` or `sk_test_...` |
| `SYNTH_STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |
| `SYNTH_STRIPE_PRICE_BASIC` | Price ID for Basic tier | `price_...` |
| `SYNTH_STRIPE_PRICE_PRO` | Price ID for Pro tier | `price_...` |
| `SYNTH_STRIPE_PRICE_FAMILY` | Price ID for Family tier | `price_...` |
| `SYNTH_APP_BASE_URL` | Frontend URL | `https://defrag.app` |
| `SYNTH_API_BASE_URL` | API URL | `https://api.defrag.app` |

### AI (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `SYNTH_OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |
| `SYNTH_OPENAI_MODEL` | Model to use | `gpt-4o-mini` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | API URL | `https://api.defrag.app` |

---

## Endpoint Tiers

### Free Endpoints (No Subscription)

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register` | User registration |
| `POST /auth/login` | User login |
| `GET /health` | Health check |
| `GET /dashboard` | UI hydration (user info, profiles, billing status) |
| `GET /profiles` | List profiles |
| `POST /profiles` | Create profile |
| `GET /profiles/{id}` | Get profile |
| `POST /profiles/{id}/synthesis` | **Deterministic synthesis** (from layers) |
| `GET /profiles/{id}/checkins` | List check-ins |
| `POST /profiles/{id}/checkins` | Record check-in |
| `GET /billing/status` | Get billing status |
| `GET /billing/usage` | Get usage summary |
| `POST /billing/checkout` | Start Stripe checkout |
| `POST /billing/portal` | Stripe billing portal |
| `GET /constellations` | List constellations |
| `POST /constellations/{id}/synthesis` | **Deterministic constellation synthesis** |

### Paid Endpoints (Require Subscription)

| Endpoint | Description | Free Tier Limit |
|----------|-------------|-----------------|
| `POST /profiles/{id}/compute_reading` | Full compute | 3/day |
| `POST /constellations/{id}/compute` | Full constellation compute | 3/day |
| `POST /ai/chat` | AI synthesis chat | 10/day |

### Disabled Endpoints (Return 501)

| Endpoint | Condition |
|----------|-----------|
| `POST /ai/chat` | If `SYNTH_OPENAI_API_KEY` is not set |

---

## Billing Flow

### 1. Checkout
```
Frontend → POST /billing/checkout?price_tier=pro
← { url: "https://checkout.stripe.com/..." }
Frontend redirects to Stripe
```

### 2. Webhook (Stripe → API)
```
Stripe → POST /billing/webhook
Events: customer.subscription.created, updated, deleted
```

### 3. Entitlement Check
```
Frontend → POST /profiles/{id}/compute_reading
API checks: StripeSubscription.status in ("active", "trialing")
If not entitled → 402 Upgrade required
```

---

## Stripe Setup

### 1. Create Products & Prices

In Stripe Dashboard:
1. Go to **Products** → **Add Product**
2. Create three products: Basic, Pro, Family
3. Set recurring prices (monthly or yearly)
4. Copy the `price_...` IDs

### 2. Configure Webhook

In Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://api.defrag.app/billing/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
4. Copy `whsec_...` signing secret

### 3. Set Environment Variables

In Render:
```
SYNTH_STRIPE_SECRET_KEY=sk_live_...
SYNTH_STRIPE_WEBHOOK_SECRET=whsec_...
SYNTH_STRIPE_PRICE_BASIC=price_...
SYNTH_STRIPE_PRICE_PRO=price_...
SYNTH_STRIPE_PRICE_FAMILY=price_...
```

---

## Migration Workflow

### One-time Migration (Render Free Tier)

Since Render free tier has no shell, use the start command method:

1. **Temporarily change Start Command:**
   ```
   alembic upgrade head && python -m uvicorn synth_engine.api.main:app --host 0.0.0.0 --port $PORT
   ```

2. **Manual Deploy**

3. **Verify in logs:**
   ```
   INFO [alembic.runtime.migration] Running upgrade ... -> ...
   ```

4. **Revert Start Command:**
   ```
   python -m uvicorn synth_engine.api.main:app --host 0.0.0.0 --port $PORT
   ```

### Local Migration

```bash
export SYNTH_DATABASE_URL='postgresql+psycopg://...?sslmode=require'
python -m alembic upgrade head
```

---

## Verification Checklist

After deployment:

- [ ] `GET /health` → 200
- [ ] `GET /docs` → Swagger UI
- [ ] `POST /auth/register` → JWT token
- [ ] `GET /dashboard` (with JWT) → user info + billing status
- [ ] `POST /billing/checkout?price_tier=basic` → checkout URL
- [ ] `POST /profiles/{id}/synthesis` → deterministic synthesis
- [ ] `POST /profiles/{id}/compute_reading` → 402 or success based on subscription
- [ ] `POST /ai/chat` → 501 (if no OpenAI key)

---

## Troubleshooting

### 402 Upgrade Required
User needs an active subscription. Check `/billing/status`.

### 501 AI Not Enabled
`SYNTH_OPENAI_API_KEY` is not set. AI endpoints are disabled.
Use `/profiles/{id}/synthesis` for deterministic insights.

### 503 Stripe Not Configured
`SYNTH_STRIPE_SECRET_KEY` is not set in Render.

### users.role column missing
Run Alembic migration. See Migration Workflow above.

### SSL connection closed unexpectedly
Remove `channel_binding=require` from `SYNTH_DATABASE_URL`.

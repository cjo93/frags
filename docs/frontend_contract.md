# Frontend Contract

API contract documentation for the Defrag frontend.

**Base URL:** `https://api.defrag.app`  
**Auth:** Bearer JWT token in `Authorization` header

---

## Authentication

### POST /register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "..."
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "user_id": "uuid"
}
```

### POST /login
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "..."
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "user_id": "uuid"
}
```

---

## Dashboard

### GET /dashboard
**Auth required:** Yes

One-call endpoint to hydrate the frontend. Returns user info, billing status with feature flags, profiles, and constellations.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "billing": {
    "has_stripe": true,
    "subscription": {
      "status": "active",
      "price_id": "price_...",
      "current_period_end": "2025-02-01T00:00:00Z",
      "cancel_at_period_end": false
    },
    "entitled": true,
    "plan_key": "integration",
    "plan_name": "Integration",
    "feature_flags": {
      "synthesis_profile": true,
      "synthesis_constellation": true,
      "compute_reading": true,
      "temporal_overlays": true,
      "state_models": true,
      "constellation_create": false,
      "constellation_compute": false,
      "ai_chat": false
    }
  },
  "profiles": [
    {
      "id": "uuid",
      "name": "John Doe",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "constellations": [
    {
      "id": "uuid",
      "name": "Family",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "usage_30d": {
    "compute_reading": 5,
    "synthesis_profile": 12
  }
}
```

---

## Subscription Tiers

### Plan Hierarchy
```
free < insight < integration < constellation
```

| Tier | Price ID Env Var | Features |
|------|------------------|----------|
| **Free** | - | Profile synthesis, constellation synthesis (deterministic only) |
| **Insight** | `STRIPE_PRICE_BASIC` | All free features |
| **Integration** | `STRIPE_PRICE_PRO` | + Re-computation, temporal overlays, state models |
| **Constellation** | `STRIPE_PRICE_FAMILY` | + Constellation create, constellation compute |

> Note: AI chat is currently admin-only (role-gated, not plan-gated).

### Feature Flags

Use `billing.feature_flags` from `/dashboard` to gate UI features:

| Flag | Description | Min Tier |
|------|-------------|----------|
| `synthesis_profile` | Profile synthesis | Free |
| `synthesis_constellation` | Constellation synthesis | Free |
| `compute_reading` | Re-compute astrological readings | Integration |
| `temporal_overlays` | Time-based overlays | Integration |
| `state_models` | Psychological state models | Integration |
| `constellation_create` | Create new constellations | Constellation |
| `constellation_compute` | Run constellation computations | Constellation |
| `ai_chat` | AI synthesis assistant | Admin-only |

---

## Billing

### GET /billing/status
**Auth required:** Yes

Get current billing status. Returns same structure as `billing` in `/dashboard`.

### POST /billing/checkout
**Auth required:** Yes

Create a Stripe checkout session.

**Query params:**
- `price_tier`: `insight` | `integration` | `constellation` (or legacy: `basic` | `pro` | `family`)

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /billing/portal
**Auth required:** Yes

Create a Stripe billing portal session for managing subscription.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET /billing/usage
**Auth required:** Yes

Get usage summary.

**Query params:**
- `days`: Number of days to summarize (default: 30)

**Response:**
```json
{
  "plan_key": "integration",
  "plan_name": "Integration",
  "usage": {
    "compute_reading": 5,
    "synthesis_profile": 12
  }
}
```

---

## Profiles

### POST /profiles
Create a new profile.

### GET /profiles
List user's profiles (keyset pagination).

### GET /profiles/{id}
Get a profile by ID.

### GET /profiles/{id}/synthesis
**No auth required if profile belongs to user**

Get deterministic synthesis for a profile. Returns structured insights without AI.

### POST /profiles/{id}/compute
**Plan required:** `integration`

Re-compute layers for a profile.

---

## Constellations

### POST /constellations
**Plan required:** `constellation`

Create a new constellation.

### GET /constellations
List user's constellations.

### GET /constellations/{id}
Get constellation details.

### GET /constellations/{id}/synthesis
Get deterministic synthesis for a constellation.

### POST /constellations/{id}/compute
**Plan required:** `constellation`

Run full constellation computation.

---

## AI Chat (Admin Only)

### POST /ai/chat
**Role required:** `admin`

Send a message to the AI synthesis assistant.

**Request:**
```json
{
  "message": "What does my natal chart reveal?",
  "thread_id": "optional-uuid",
  "profile_id": "optional-uuid",
  "constellation_id": "optional-uuid"
}
```

### GET /ai/threads
List user's chat threads.

### GET /ai/threads/{id}
Get a chat thread with messages.

---

## Error Codes

| Code | Meaning |
|------|---------|
| `401` | Unauthorized - invalid or missing token |
| `402` | Payment Required - upgrade plan needed |
| `403` | Forbidden - insufficient role |
| `404` | Not Found |
| `429` | Rate Limited |
| `501` | Not Implemented - feature not enabled |
| `503` | Service Unavailable - billing/AI not configured |

---

## Rate Limiting

Token bucket rate limiter: 10 requests per second burst, 5 requests per second sustained.

Rate limit headers returned:
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## CORS

Allowed origins:
- `https://defrag.app`
- `https://www.defrag.app`
- `https://*.vercel.app` (for preview deployments)

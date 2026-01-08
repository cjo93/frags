# Defrag Developer Guide

This document provides a comprehensive overview for developers working on Defrag across backend (FastAPI), frontend (Next.js), and the Cloudflare Agent Worker. It covers local setup, environment variables, build/test/lint commands, deployment, release workflow, and architecture.

## Overview

Defrag is a distributed application composed of:
- Backend API (FastAPI) running on Render, with SQLAlchemy/Alembic and Stripe billing.
- Frontend (Next.js App Router) running on Vercel, talking to the backend via JWT.
- Cloudflare Agent Worker (Workers + Durable Objects) optionally providing agent chat/tooling, D1 audit/memory, and R2 artifacts.

Key contracts and trust posture:
- Requests propagate `X-Request-Id` end-to-end.
- Agent tool gateway calls are HMAC-signed with `SYNTH_BACKEND_HMAC_SECRET` / `BACKEND_HMAC_SECRET`.
- JWT-based auth for frontend ↔ backend; agent-worker uses backend-minted agent JWTs.
- Size/rate/concurrency limits enforced in backend middleware and worker abuse controls.

## Architecture & Key Directories

- Backend (Python, FastAPI)
  - API entry: [synth_engine/api/main.py](../synth_engine/api/main.py)
  - Routers: [synth_engine/api/ai.py](../synth_engine/api/ai.py), [synth_engine/api/billing.py](../synth_engine/api/billing.py), [synth_engine/api/admin.py](../synth_engine/api/admin.py)
  - Auth & deps: [synth_engine/api/auth.py](../synth_engine/api/auth.py), [synth_engine/api/deps.py](../synth_engine/api/deps.py)
  - Abuse control: [synth_engine/api/abuse.py](../synth_engine/api/abuse.py), rate limiting [synth_engine/api/ratelimit.py](../synth_engine/api/ratelimit.py)
  - Config: [synth_engine/config.py](../synth_engine/config.py)
  - Storage: [synth_engine/storage/models.py](../synth_engine/storage/models.py), [synth_engine/storage/repo.py](../synth_engine/storage/repo.py), Alembic migrations under [alembic/](../alembic)
  - Compute & fusion: [synth_engine/compute/*](../synth_engine/compute), [synth_engine/fusion/*](../synth_engine/fusion)
  - Telemetry: [synth_engine/telemetry/adapter.py](../synth_engine/telemetry/adapter.py)
  - Tests: [tests/](../tests)

- Frontend (Next.js)
  - App router: [frontend/src/app/*](../frontend/src/app)
  - API client: [frontend/src/lib/api.ts](../frontend/src/lib/api.ts)
  - Components: [frontend/src/components/*](../frontend/src/components)
  - Config: [frontend/next.config.ts](../frontend/next.config.ts), [frontend/tsconfig.json](../frontend/tsconfig.json)

- Cloudflare Agent Worker
  - Entry: [cloudflare/agent-worker/src/index.ts](../cloudflare/agent-worker/src/index.ts)
  - Durable Object: [cloudflare/agent-worker/src/do/UserAgentDO.ts](../cloudflare/agent-worker/src/do/UserAgentDO.ts)
  - Tools: [cloudflare/agent-worker/src/tools/*](../cloudflare/agent-worker/src/tools)
  - Config: [cloudflare/agent-worker/wrangler.toml](../cloudflare/agent-worker/wrangler.toml)
  - Docs/Scripts: [cloudflare/agent-worker/README.md](../cloudflare/agent-worker/README.md), [cloudflare/agent-worker/scripts/*](../cloudflare/agent-worker/scripts)

## Prerequisites

- macOS or Linux recommended
- Backend (Python): Python 3.10+ (see [pyproject.toml](../pyproject.toml))
- Frontend: Node.js 20+ recommended (Next 16), npm
- Worker: Cloudflare Wrangler 3.99+, Node.js 20+ for typechecking
- Database: Postgres (Neon for production), SQLite is supported locally by default

## Environment Variables & Secrets

Backend (Render / local): Prefix `SYNTH_` (see [synth_engine/config.py](../synth_engine/config.py)).

Required:
- `SYNTH_DATABASE_URL` — DB URL (Postgres: `postgresql+psycopg://...`; local default: `sqlite:///./synth.db`)
- `SYNTH_JWT_SECRET` — JWT signing secret (auto-generated if not set; set explicitly in prod)
- `SYNTH_JWT_ALGORITHM` — Default `HS256`
- `SYNTH_BACKEND_HMAC_SECRET` — HMAC secret to verify worker tool calls

Stripe (billing):
- `SYNTH_STRIPE_SECRET_KEY`, `SYNTH_STRIPE_WEBHOOK_SECRET`
- `SYNTH_STRIPE_PRICE_BASIC`, `SYNTH_STRIPE_PRICE_PRO`, `SYNTH_STRIPE_PRICE_FAMILY`

URLs:
- `SYNTH_APP_BASE_URL` — default `https://defrag.app`
- `SYNTH_API_BASE_URL` — default `https://api.defrag.app`

AI provider configuration (optional):
- `SYNTH_AI_PROVIDER` — `disabled | cloudflare | serverless_gpu | openai | gemini | auto` (default `auto`)
- Cloudflare: `SYNTH_CLOUDFLARE_ACCOUNT_ID`, `SYNTH_CLOUDFLARE_API_TOKEN`, model names
- OpenAI: `SYNTH_OPENAI_API_KEY`, `SYNTH_OPENAI_MODEL`
- Serverless GPU: `SYNTH_SERVERLESS_GPU_API_KEY`, `SYNTH_SERVERLESS_GPU_ENDPOINT`
- Feature flags: `SYNTH_AI_IMAGE_ENABLED`, `SYNTH_AI_AUDIO_ENABLED`

Bot protection (optional):
- `SYNTH_TURNSTILE_SECRET_KEY`, `SYNTH_TURNSTILE_ENABLED`

Dev admin (founder testing; see [docs/dev-admin.md](./dev-admin.md)):
- `SYNTH_DEV_ADMIN_ENABLED`, `SYNTH_DEV_ADMIN_EMAIL`, `SYNTH_DEV_ADMIN_TOKEN` (not used for login; email match required), `SYNTH_DEV_ADMIN_EXPIRES_AT`
- `SYNTH_ADMIN_MUTATIONS_ENABLED`

Frontend (Vercel / local):
- `NEXT_PUBLIC_API_URL` — points to backend (`http://localhost:8000` in dev, `https://api.defrag.app` in prod)
- `NEXT_PUBLIC_ENABLE_DEV` — optional, enables dev/admin routes in UI

Cloudflare Agent Worker (wrangler secrets):
- `BACKEND_HMAC_SECRET` — HMAC for signing tool gateway requests
- Agent JWT verification: choose ONE
  - HS256: `AGENT_JWT_SECRET`
  - RS256: `JWT_PUBLIC_KEY`
- Claims: `AGENT_JWT_ISS`, `AGENT_JWT_AUD` (default audience: `agent-worker`)
- Vars: `BACKEND_URL`, `ENVIRONMENT`

Secrets Handling:
- Backend uses Pydantic Settings to load `SYNTH_*` from environment; avoid committing secrets.
- Worker secrets are managed via `wrangler secret put` and never committed.
- Frontend only exposes `NEXT_PUBLIC_*` variables; do not store secrets client-side.
- Stripe keys must be set in production environment only; webhook secret is required for billing updates.

## Local Setup

Backend:
```bash
# From repo root
pip install -e .
# Apply migrations (SQLite default)
alembic upgrade head
# Run dev server
python -m uvicorn synth_engine.api.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm i
npm run dev
# Open http://localhost:3000
```
Configure API base URL via `NEXT_PUBLIC_API_URL` or rely on default `https://api.defrag.app`.

Cloudflare Agent Worker (optional for local UI/backend dev):
```bash
cd cloudflare/agent-worker
npm i
# Local (no CF account):
wrangler dev --local
# Remote dev (requires wrangler login):
wrangler dev
```
Bindings and secrets per [cloudflare/agent-worker/wrangler.toml](../cloudflare/agent-worker/wrangler.toml). Use scripts under [cloudflare/agent-worker/scripts](../cloudflare/agent-worker/scripts).

## Build Commands

Backend:
```bash
# Production run command (Render)
python -m uvicorn synth_engine.api.main:app --host 0.0.0.0 --port $PORT
```

Frontend:
```bash
npm run build
npm start
```

Cloudflare Agent Worker:
```bash
wrangler deploy
```

## Test & Lint

Backend (pytest):
```bash
pytest -q
# Focused tests
pytest tests/test_billing.py -q
```

Frontend:
```bash
npm run lint
```

Worker:
```bash
npm run typecheck
```

## Deployment & Release

Backend (Render):
- Service type: Web Service
- Start Command: `python -m uvicorn synth_engine.api.main:app --host 0.0.0.0 --port $PORT`
- Migrations: either run locally or temporarily prefix start command with `alembic upgrade head && ...` (see [docs/deployment.md](./deployment.md))
- Env vars: set all `SYNTH_*` values and Stripe keys
- Verification: `GET /health`, `GET /docs`, minimal flows in [docs/deployment.md](./deployment.md)

Frontend (Vercel):
- Set `NEXT_PUBLIC_API_URL`
- Standard Next.js build `npm run build`; deploy via Vercel project

Agent Worker (Cloudflare):
- `wrangler deploy`
- Set secrets: `BACKEND_HMAC_SECRET`, agent JWT verification secret or public key
- Bindings: D1/R2/Vectorize per [wrangler.toml](../cloudflare/agent-worker/wrangler.toml)

Release Checklist:
- Backend: migrations applied; Stripe webhook configured; healthcheck OK
- Frontend: environment configured; API connectivity verified
- Worker: secrets set; status endpoint OK; tool gateway HMAC configured
- Observability: Request IDs propagated; audit logs enabled (see deps/audit logger)

## Cross-Service Contracts

- Agent JWTs: minted by backend `POST /auth/agent-token` and verified by worker (`AGENT_JWT_SECRET` or `JWT_PUBLIC_KEY`).
- Tool calls: Worker → Backend signed with `BACKEND_HMAC_SECRET`; backend verifies via `SYNTH_BACKEND_HMAC_SECRET`.
- Request tracing: `X-Request-Id` propagated in backend middleware and worker util.
- Rate limiting: backend token bucket (`default`, `telemetry`, `compute` groups) and worker abuse module.

## Security & Trust Posture

- Deterministic compute first; AI endpoints optional and gated
- Explicit boundaries: no medical claims, no diagnosis or treatment
- Exports are sanitized and time-limited
- No dark patterns; consent-first flows

## Troubleshooting

- `Database tables missing. Run: alembic upgrade head` — apply migrations
- `402 Upgrade Required` — user lacks subscription; check `/billing/status`
- `501 AI Not Enabled` — set `SYNTH_OPENAI_API_KEY` or use deterministic synthesis endpoints
- Stripe webhook failures — verify `SYNTH_STRIPE_WEBHOOK_SECRET` and webhook events
- Worker JWT errors — ensure `AGENT_JWT_SECRET` or `JWT_PUBLIC_KEY` are set and `iss/aud` match

## References

- Deployment guide: [docs/deployment.md](./deployment.md)
- Dev admin: [docs/dev-admin.md](./dev-admin.md)
- Copilot instructions: [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- Cloudflare agent worker: [cloudflare/agent-worker/README.md](../cloudflare/agent-worker/README.md)

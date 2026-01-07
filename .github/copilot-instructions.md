# Copilot instructions (frags / defrag)

## Big picture
- **Python API (Render)**: FastAPI app in [synth_engine/api/main.py](synth_engine/api/main.py). SQLAlchemy models in `synth_engine/storage/models.py`, DB access/helpers in `synth_engine/storage/repo.py`, migrations in `alembic/`.
- **AI endpoints**: `/ai/*` router in [synth_engine/api/ai.py](synth_engine/api/ai.py) builds *grounded context* from stored computed layers and calls the configured provider (`synth_engine/ai/providers/*`).
- **Cloudflare agent worker**: edge router in [cloudflare/agent-worker/src/index.ts](cloudflare/agent-worker/src/index.ts) proxies authenticated requests into a per-user Durable Object [cloudflare/agent-worker/src/do/UserAgentDO.ts](cloudflare/agent-worker/src/do/UserAgentDO.ts) for chat/tool execution + optional D1/R2/Vectorize persistence.
- **Next.js frontend (Vercel)**: app router under `frontend/src/app/*`; API wrapper in [frontend/src/lib/api.ts](frontend/src/lib/api.ts) stores JWT in `localStorage` and sends `Authorization: Bearer <token>`.

## Local dev workflows
- **Backend (Python 3.10+)**
  - Install: `pip install -e .`
  - Migrate: `alembic upgrade head` (required; app fails fast if tables missing)
  - Run: `python -m uvicorn synth_engine.api.main:app --reload --port 8000`
  - Tests: `pytest` (see `tests/test_billing.py` for unit-style tests with mocks)
- **Frontend** (from `frontend/`): `npm i && npm run dev` (defaults to `http://localhost:3000`).
  - Config: [frontend/src/lib/api.ts](frontend/src/lib/api.ts) uses `NEXT_PUBLIC_API_URL` (falls back to `https://api.defrag.app`).
- **Worker** (from `cloudflare/agent-worker/`): `npm i && wrangler dev --local`.
  - Optional local D1 schema: `wrangler d1 execute ... --file src/memory/schema.sql --local` (see `cloudflare/agent-worker/README.md`).

## Auth, entitlements, and “dev admin”
- Backend auth is JWT (`SYNTH_JWT_SECRET`, `SYNTH_JWT_ALGORITHM`), with login accepting query params or JSON body (see `/auth/login` in [synth_engine/api/main.py](synth_engine/api/main.py)).
- “Dev admin” bypass is **opt-in and audited** via settings in [synth_engine/api/deps.py](synth_engine/api/deps.py) (`SYNTH_DEV_ADMIN_ENABLED`, `SYNTH_DEV_ADMIN_TOKEN`, etc.). Billing blocks dev-admin users (see [synth_engine/api/billing.py](synth_engine/api/billing.py)).
- Plan names appear in both **legacy** (`basic/pro/family`) and **new** (`insight/integration/constellation`) forms; checkout accepts both (see [synth_engine/api/billing.py](synth_engine/api/billing.py) and `tests/test_billing.py`).

## Cross-service contracts (worker ↔ backend)
- Agent JWTs for the worker are minted by backend `POST /auth/agent-token` (see [synth_engine/api/main.py](synth_engine/api/main.py)) and verified in [cloudflare/agent-worker/src/auth/verify.ts](cloudflare/agent-worker/src/auth/verify.ts).
- Worker → backend tool calls are **HMAC-signed** with `BACKEND_HMAC_SECRET` and verified by backend using `SYNTH_BACKEND_HMAC_SECRET` (see `/tools/natal/export_full` and `_verify_tool_signature` in [synth_engine/api/main.py](synth_engine/api/main.py), and signing in [cloudflare/agent-worker/src/tools/index.ts](cloudflare/agent-worker/src/tools/index.ts)).
- Request tracing: both backend and worker propagate `X-Request-Id` (backend middleware in `synth_engine/api/abuse.py`, worker helper `getOrCreateRequestId` in `cloudflare/agent-worker/src/util/requestId`).

## Repo-specific patterns to follow
- Prefer adding API routes as routers (see `synth_engine/api/billing.py`, `synth_engine/api/ai.py`) and include them from [synth_engine/api/main.py](synth_engine/api/main.py).
- For AI endpoints, enforce size/rate/concurrency limits via helpers in `synth_engine/api/abuse.py` (don’t invent new limit mechanisms).
- When adding agent tools, wire the allowlist in `cloudflare/agent-worker/src/tools/index.ts` and implement the backend handler under `/tools/*` with HMAC verification.

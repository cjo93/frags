# defrag-agent (text-first)

Endpoints:
- GET /health
- GET /agent/status
- POST /agent/chat
  Body: { "message": string, "pageContext"?: string }
- POST /agent/tool
  Body: { "name": "natal_export", "args"?: any }
- POST /agent/export
  Body: { "safe_json": any, "title"?: string }
- GET /agent/artifacts/:key?exp=...&sig=...

Auth:
- Authorization: Bearer <JWT>
- JWT must be RS256 and include sub (user id)

Headers:
- X-Request-Id is accepted and returned; generated if missing.

Bindings (wrangler.toml):
- Durable Object: USER_AGENT_DO
- D1: AGENT_DB
- Optional Vectorize: AGENT_MEM_INDEX
- Workers AI: AI
- R2: AGENT_R2

Secrets:
- wrangler secret put JWT_PUBLIC_KEY (or AGENT_JWT_SECRET)
- wrangler secret put AGENT_JWT_ISS
- wrangler secret put AGENT_JWT_AUD
- wrangler secret put DEV_ADMIN_TOKEN (optional)
- wrangler secret put BACKEND_HMAC_SECRET
- wrangler secret put EXPORT_SIGNING_SECRET (optional override)

Backend env:
- SYNTH_BACKEND_HMAC_SECRET should match BACKEND_HMAC_SECRET

Local setup:
- npm i
- create `cloudflare/agent-worker/.dev.vars` with local secrets (see `.dev.vars.example` if present)
- ./scripts/cf-init.sh (creates D1/R2/Vectorize if missing)
- copy database_id into wrangler.toml
- ./scripts/d1-migrate.sh (set `D1_MODE=--local` for local dev)
- wrangler dev --local

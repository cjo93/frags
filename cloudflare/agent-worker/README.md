# defrag-agent (text-first)

Endpoints:
- GET /health
- POST /agent/chat
  Body: { "message": string, "pageContext"?: string }
- POST /agent/tool
  Body: { "name": "natal_export_full", "args"?: any }

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
- wrangler secret put JWT_PUBLIC_KEY
- wrangler secret put DEV_ADMIN_TOKEN (optional)

Local setup:
- npm i
- wrangler d1 create defrag-agent-db
- copy database_id into wrangler.toml
- wrangler d1 execute defrag-agent-db --file src/memory/schema.sql --local
- wrangler dev

# defrag-agent (text-first)

## Endpoints
- GET `/health`
- GET `/agent/status`
- POST `/agent/chat` — Body: `{ "message": string, "pageContext"?: string }`
- POST `/agent/tool` — Body: `{ "name": "natal_export", "args"?: any }` (also accepts `tool`)
- POST `/agent/export` — Body: `{ "safe_json": any, "title"?: string }`
- GET `/agent/artifacts/:key?exp=...&sig=...`

## Auth
- `Authorization: Bearer <JWT>`
- JWT can be RS256 (`JWT_PUBLIC_KEY`) or HS256 (`AGENT_JWT_SECRET`).
- Optional issuer/audience: `AGENT_JWT_ISS`, `AGENT_JWT_AUD` (default audience: `agent-worker`).

## Security & Trust Posture
- Tool gateway calls are HMAC-signed with `BACKEND_HMAC_SECRET`.
- Request IDs are propagated and returned in responses.
- D1 audit trails for tool calls and conversations.
- R2 artifacts are served via signed URLs with short TTLs.
- Rate and concurrency limits enforced per endpoint.

## Beta Access
- Managed by backend admin endpoints; the Worker enforces JWT scopes only.

## Demo Script (30 seconds)
1. `wrangler dev --remote --port 8787`
2. `curl -i http://localhost:8787/agent/status`
3. Call `/agent/tool` with a valid agent JWT.
4. Verify tool_audit in D1.

## AI Response Style Guide
- Use deterministic compute results; do not invent placements.
- Be concise, structured, and avoid predictions or medical advice.

## Operational Checklist
- Bindings: `USER_AGENT_DO`, `AGENT_DB`, `AGENT_R2`, `AGENT_MEM_INDEX`, `AI`.
- Secrets: `AGENT_JWT_SECRET` or `JWT_PUBLIC_KEY`, `BACKEND_HMAC_SECRET`.
- Vars: `BACKEND_URL`, `AGENT_JWT_ISS`, `AGENT_JWT_AUD`.
- Scripts: `./scripts/cf-init.sh`, `./scripts/d1-migrate.sh`, `./scripts/agent-smoke.sh`.

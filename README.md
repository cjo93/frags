# Defrag

Defrag is a deterministic synthesis engine with an interpretation layer. It computes astrological and symbolic systems from structured inputs, then uses AI to explain those computed results with clear boundaries.

## Security & Trust Posture
- Deterministic compute first; AI is interpretation only.
- Optional memory; user-controlled and scoped to the active profile.
- Request IDs and rate limits across sensitive endpoints.
- Exports are rendered artifacts with expiring links (no raw JSON downloads).
- No cross-user data sharing.

## Beta Access
- Dev admin is email-based only: `SYNTH_DEV_ADMIN_ENABLED=true` + `SYNTH_DEV_ADMIN_EMAIL=chadowen93@gmail.com`.
- Admin-only endpoints:
  - `POST /admin/beta/grant` with `{ "email": "user@example.com", "plan_key": "beta" | "pro" }`
  - `POST /admin/beta/revoke` with `{ "email": "user@example.com" }`
- Beta grants set plan access without granting admin privileges.

## Demo Script (30 seconds)
1. Sign in and open Dashboard.
2. Create or select a profile.
3. Open AgentDock and ask for an export.
4. Show the expiring export link and the trust strip.
5. Open Settings and show optional memory + privacy notes.

## AI Response Style Guide
- Cite computed layers when available; do not invent placements.
- No prediction, diagnosis, or medical/financial advice.
- Be concise, structured, and ask clarifying questions when context is missing.
- Offer next steps that are reversible and low-risk.

## Operational Checklist
- Backend env: `SYNTH_DATABASE_URL`, `SYNTH_JWT_SECRET`, `SYNTH_BACKEND_HMAC_SECRET`, `SYNTH_DEV_ADMIN_EMAIL`.
- Worker env: `AGENT_JWT_SECRET` or `JWT_PUBLIC_KEY`, `AGENT_JWT_ISS`, `AGENT_JWT_AUD`, `BACKEND_HMAC_SECRET`.
- Frontend env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ENABLE_DEV` (dev-only).
- Ensure `X-Request-Id` is passed end-to-end and logged.
- Rate limits are enforced in `synth_engine/api/abuse.py` and the Worker abuse module.

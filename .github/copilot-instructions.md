# Copilot instructions (frags)

## Big picture
- Next.js App Router + route handlers live under `app/` (API routes in `app/api/**/route.ts`, pages in `app/**/page.tsx`).
- Data layer is Prisma + Postgres. Core models are in `prisma/schema.prisma` (User/Profile/BirthData/FamilyEdge plus ComputeRun/ComputeArtifact and EphemerisRequest/EphemerisCache).
- “Deterministic compute” flow is implemented in `app/api/compute/route.ts`:
  - Builds canonical inputs (including normalized birth data), then computes `inputsHash` via `canonicalStringify` + `sha256Hex` (`lib/utils/canonical.ts`).
  - Uses Prisma `upsert` keyed by composite uniques (e.g. `profileId_engineVersion_inputsHash`) to make compute idempotent.
  - Attaches ephemeris data from `getOrCreateEphemeris` (`lib/ephemeris/cache.ts`) and persists a canonical artifact.
- Ephemeris is cached in DB and is deterministic:
  - Canonical request is built in `lib/horizons.ts` (sorts `quantities`, rounds TOPO coords), cache key is a sha256 of canonical JSON.
  - By default it loads fixtures from `fixtures/horizons/*.txt` (`HORIZONS_MODE=fixtures`); “live” mode is intentionally not wired.
- AI assistant streams responses from OpenAI and can call compute:
  - `app/api/ai/route.ts` uses `openai.responses.stream()` and exposes a `run_compute` tool that POSTs to `/api/compute`.
  - The UI reads the streamed response body directly in `app/profiles/[id]/insights/components/ChatPanel.tsx`.

## Local workflows
- Install + run: `npm install` → `npx prisma generate` → `npm run prisma:migrate` → `npm run dev`.
- Useful scripts (see `package.json`): `npm test` (Vitest), `npm run typecheck`, `npm run lint`, `npm run seed:profiles`.
- Env vars used across the app:
  - DB/Auth: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
  - AI: `OPENAI_API_KEY`, `OPENAI_MODEL`.
  - Ephemeris: `HORIZONS_MODE` (defaults to fixtures).
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - Billing: `BILLING_MODE`, `ENTITLED_USER_IDS`, `ENABLE_ADMIN_ENTITLEMENT`, `ENTITLEMENT_ADMIN_IDS`.

## Codebase conventions (follow these)
- Imports use the `@/*` TS path alias (configured in `tsconfig.json`).
- Auth for API routes: call `requireUserId()` (`lib/auth/session.ts`). It always requires a real Auth.js session.
- Validate and normalize request payloads with Zod schemas in `lib/profiles/validation.ts` (e.g., `profileCreateSchema`, `familyEdgeSchema`, `normalizeBirthData`).
- When adding caching/idempotency, reuse the existing hashing approach (`canonicalStringify` + `sha256Hex`) rather than ad-hoc `JSON.stringify`.
- Prefer Prisma `upsert` with the existing unique constraints (examples: `ComputeRun`, `ComputeArtifact`, `FamilyEdge`).

## Tests
- Tests live in `tests/*.test.ts` and often mock `@/lib/prisma`, `@/lib/auth/session`, and `@/lib/ephemeris/cache` (see `tests/compute.test.ts`, `tests/ephemeris.test.ts`).
- Route handlers are tested by importing the handler directly (e.g. `POST` from `app/api/compute/route.ts`) and calling it with a `Request`.

## Integrations
- Stripe is currently a guarded stub: `lib/stripe/server.ts` throws without `STRIPE_SECRET_KEY`; webhook handler in `app/api/stripe/webhook/route.ts` does not verify signatures yet.

# Defrag project conventions (Codex)

Scope: entire repository. Follow these rules for all changes.

## Determinism and hashing
- Use `canonicalStringify` + `sha256Hex` for all hashes and cache keys; never use `JSON.stringify` directly for persistent artifacts.
- No nondeterministic data in artifacts (avoid `Date.now`, random IDs, per-request timestamps); prefer explicit, stable inputs.

## Compute idempotency
- Compute runs are keyed by `(profileId, engineVersion, inputsHash)` and must be restart-safe and idempotent.
- Reuse existing Prisma uniques and upserts; never drop data on conflicts—abort or surface an error instead.

## Ephemeris cache contract
- Canonical request builder lives in `lib/horizons.ts`; cache key is `sha256(canonicalStringify(request))`.
- DB tables: `EphemerisRequest` + `EphemerisCache` store `rawText`, `canonicalJson`, `canonicalHash`.
- Default tests/CI use `HORIZONS_MODE=fixtures`; live mode is optional and must be wrapped with timeouts/retries and caching.

## AI streaming and tool calling
- `/api/ai` streams via the OpenAI Responses API and may call the `run_compute` tool (which invokes the compute pipeline).
- Keep tool schemas strict; do not allow arbitrary tool execution or prompt-driven code paths.

## Frontend insights and R3F visualization
- The insights page visualizes ephemeris data (scene data from `L_env.ephemeris.canonical.points`).
- Emphasize performance: sample/decimate points, memoize derived arrays, and avoid re-instantiating geometries each render.


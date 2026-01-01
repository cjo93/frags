# Frags Scaffold

This repository is intentionally minimal and now contains a Next.js App Router scaffold with Prisma, Auth.js wiring, and Stripe placeholders.

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Postgres connection + Auth/Stripe secrets.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate the Prisma client and run the initial migration:
   ```bash
   npx prisma generate
   npm run prisma:migrate
   ```
4. Start the local dev server:
   ```bash
   npm run dev
   ```
5. (Optional) Seed demo profiles/family edges after migrations:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/frags" npm run seed:profiles
   ```

## Compute API quick checks

With `npm run dev` running (and dev auth fallback enabled), you can smoke test the compute endpoint:

```bash
# Replace profileId with one from /api/profiles (or seed output)
curl -sS -X POST http://localhost:3000/api/compute \
  -H "Content-Type: application/json" \
  -d '{"profileId":"<profile-id>","engineVersion":"1.0.0","options":{"mode":"demo"}}' | jq
```

Re-running the same payload should return `cached: true` and the same `computeRunId`.

## AI assistant

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in your `.env.local`, then open `/profiles/:id/insights` to chat with the AI assistant. It streams via the OpenAI Responses API and can invoke the `run_compute` tool to call `/api/compute`.

## Features

- Next.js 15 App Router with TypeScript + strict mode
- Prisma + Postgres configuration with starter `User` model
- Auth.js credentials provider stub plus `app/protected` placeholder route
- Stripe server client wrapper with env-var safeguards
- `.env.example` + README instructions for bootstrap

## Next Steps

After setting up the environment, you can:
- Flesh out Auth.js providers or replace the credentials stub
- Add more Prisma models + migrations for your domain (Profile / Family / ComputeRun / Horizons)
- Wire Stripe checkout or payment intents using `lib/stripe/server.ts`

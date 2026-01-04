# Render deployment

## Start command

Use this as the Render Start Command:

```
alembic upgrade head && python -m uvicorn synth_engine.api.main:app --host 0.0.0.0 --port $PORT
```

If your Render plan has no shell access, this is the simplest way to run migrations.

## Environment variables

These are read from environment using the `SYNTH_` prefix:

- `SYNTH_DATABASE_URL`: SQLAlchemy database URL
  - Neon + psycopg v3 example:
    - `postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require`
- `SYNTH_JWT_SECRET`: JWT signing secret (long random string)
- `SYNTH_JWT_ALGORITHM`: defaults to `HS256`

## Checklist

1. Deploy logs show Alembic upgrades running (e.g. `Running upgrade ...`).
2. `GET /health` returns `200`.
3. `POST /auth/register` returns `200` (JWT token).

## Troubleshooting

- **500 on `/auth/*`**
  - If logs mention missing tables, migrations did not run (or ran against the wrong DB URL).
  - Confirm `SYNTH_DATABASE_URL` is set and does not include extra quotes/spaces.

- **DB connection errors**
  - Neon typically requires `sslmode=require`.

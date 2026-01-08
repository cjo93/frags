# Dev Admin / Founder Access

This document describes the dev admin access path used for founder testing and emergency debugging.

## Security Posture
- Dev admin is email-based only.
- Access is granted only when `SYNTH_DEV_ADMIN_ENABLED=true` and the authenticated email matches `SYNTH_DEV_ADMIN_EMAIL`.
- There is no token bypass; standard JWT auth is required.

## Environment Variables

### Backend (Render / Server)
| Variable | Required | Description |
|----------|----------|-------------|
| `SYNTH_DEV_ADMIN_ENABLED` | Yes | Set to `true` to enable dev admin. Default: `false` |
| `SYNTH_DEV_ADMIN_EMAIL` | Yes | Exact email granted dev admin role |
| `SYNTH_DEV_ADMIN_EXPIRES_AT` | Optional | ISO timestamp to auto-disable dev admin |
| `SYNTH_ADMIN_MUTATIONS_ENABLED` | Optional | Enable impersonation and role changes |

### Frontend (Vercel / Client)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ENABLE_DEV` | Yes | Set to `true` to show `/dev` and `/admin` routes |

## How to Enable

### Local Development
1. Set backend env:
   ```bash
   SYNTH_DEV_ADMIN_ENABLED=true
   SYNTH_DEV_ADMIN_EMAIL=you@example.com
   SYNTH_ADMIN_MUTATIONS_ENABLED=true  # Optional
   ```
2. Start the backend.
3. Set frontend env:
   ```bash
   NEXT_PUBLIC_ENABLE_DEV=true
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Sign in normally with the dev admin email.
5. Visit `/admin`.

### Staging / Production (Emergency Only)
1. Set backend env:
   - `SYNTH_DEV_ADMIN_ENABLED=true`
   - `SYNTH_DEV_ADMIN_EMAIL=founder@defrag.app`
2. Redeploy backend.
3. Set frontend env:
   - `NEXT_PUBLIC_ENABLE_DEV=true`
4. Sign in with the dev admin email, then access `/admin`.
5. Disable dev admin immediately after use.

## API Endpoints (Admin Only)
- `GET /admin/users`
- `GET /admin/users/{user_id}`
- `GET /admin/usage/{user_id}`
- `GET /admin/stats`
- `GET /admin/ai/config`
- `GET /admin/config`

## Example: cURL Test
```bash
# Use a JWT from /auth/login for the dev admin email
curl -s 'https://api.defrag.app/admin/config' \
  -H 'Authorization: Bearer <JWT>'
```

## Audit Logging
All dev admin actions are logged with:
- Timestamp (ISO 8601)
- Request path and method
- Dev admin email

Example:
```
2026-01-05T21:50:00 [AUDIT] DEV_ADMIN: Access granted | path=/dashboard | method=GET | email=founder@defrag.app
```

## Security Checklist
- [ ] `SYNTH_DEV_ADMIN_ENABLED=false` by default
- [ ] `SYNTH_DEV_ADMIN_EMAIL` matches the intended admin account
- [ ] `SYNTH_ADMIN_MUTATIONS_ENABLED=false` unless needed
- [ ] Disable immediately after emergency use

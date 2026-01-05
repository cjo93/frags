# Dev Admin / Founder Access

This document explains how to use the secure dev admin system for founder testing and emergency debugging.

## ⚠️ Security Warning

**NEVER enable dev admin in production unless absolutely necessary for emergency debugging.**

The dev admin system bypasses normal authentication and billing checks. It should only be used:
- Locally during development
- In staging environments for testing
- In production only during emergencies (with immediate disable after)

All dev admin actions are **fully audited** with timestamps and logged to stdout.

---

## Environment Variables

### Backend (Render / Server)

| Variable | Required | Description |
|----------|----------|-------------|
| `SYNTH_DEV_ADMIN_ENABLED` | Yes | Set to `true` to enable dev admin. Default: `false` |
| `SYNTH_DEV_ADMIN_TOKEN` | Yes | A **32+ character random secret**. Generate with `openssl rand -hex 32` |
| `SYNTH_DEV_ADMIN_EMAIL` | Yes | Email to associate with dev admin session (for audit logs) |
| `SYNTH_ADMIN_MUTATIONS_ENABLED` | Optional | Set to `true` to enable impersonation and role changes. Default: `false` |

### Frontend (Vercel / Client)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ENABLE_DEV` | Yes | Set to `true` to show `/dev` and `/admin` routes |

---

## How to Enable

### Local Development

1. Create a `.env` file in the backend root:
   ```bash
   SYNTH_DEV_ADMIN_ENABLED=true
   SYNTH_DEV_ADMIN_TOKEN=your-local-dev-token-at-least-32-chars
   SYNTH_DEV_ADMIN_EMAIL=you@example.com
   SYNTH_ADMIN_MUTATIONS_ENABLED=true  # Optional
   ```

2. Create a `.env.local` file in `frontend/`:
   ```bash
   NEXT_PUBLIC_ENABLE_DEV=true
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Start the backend: `uvicorn synth_engine.api.main:app --reload`
4. Start the frontend: `cd frontend && npm run dev`
5. Visit `http://localhost:3000/dev`

### Staging Environment

1. Set env vars in Render (backend):
   - `SYNTH_DEV_ADMIN_ENABLED=true`
   - `SYNTH_DEV_ADMIN_TOKEN=<generate-unique-32+-char-token>`
   - `SYNTH_DEV_ADMIN_EMAIL=founder@defrag.app`

2. Set env vars in Vercel (frontend):
   - `NEXT_PUBLIC_ENABLE_DEV=true`

3. Deploy both services
4. Visit `https://your-staging.vercel.app/dev`

### Production (Emergency Only)

**Only do this if you need to debug a live issue and cannot reproduce locally.**

1. Generate a new unique token: `openssl rand -hex 32`
2. Set in Render:
   - `SYNTH_DEV_ADMIN_ENABLED=true`
   - `SYNTH_DEV_ADMIN_TOKEN=<new-unique-token>`
   - `SYNTH_DEV_ADMIN_EMAIL=your@email.com`
3. Set in Vercel: `NEXT_PUBLIC_ENABLE_DEV=true`
4. Redeploy both services
5. **Debug your issue**
6. **IMMEDIATELY disable by setting `SYNTH_DEV_ADMIN_ENABLED=false`**
7. Rotate the token for next time

---

## Using Dev Admin

### 1. Enter Dev Mode (Frontend)

1. Navigate to `/dev`
2. Paste your `SYNTH_DEV_ADMIN_TOKEN` value
3. Click "Enter Dev Mode"
4. You'll be redirected to `/dashboard` with full Constellation access

### 2. Access Admin Panel

Once in dev mode:
1. Navigate to `/admin`
2. View platform stats (users, profiles, subscriptions)
3. View system config (Stripe, OpenAI status)
4. Browse user list with plans and roles

### 3. Impersonate a User (if mutations enabled)

With `SYNTH_ADMIN_MUTATIONS_ENABLED=true`:
1. Go to `/admin`
2. Find the user in the list
3. Click "Impersonate"
4. A 15-minute JWT will be generated
5. Click "Use Token & Switch" to log in as that user

**Note:** This ends your dev admin session. Use `/dev` to re-enter admin mode.

### 4. Exit Dev Mode

- Click "Exit Dev Mode" on `/dev` or `/admin`
- Or manually clear `localStorage.token` in browser dev tools

---

## API Endpoints

### Read-Only (Admin Role Required)

| Endpoint | Description |
|----------|-------------|
| `GET /admin/users` | List all users with plan/Stripe info |
| `GET /admin/users/{user_id}` | Get user details + billing + usage |
| `GET /admin/usage/{user_id}` | Get usage summary for a user |
| `GET /admin/stats` | Platform-wide stats |
| `GET /admin/ai/config` | AI config status (no secrets) |
| `GET /admin/config` | System config status |

### Mutations (Admin + Mutations Enabled)

| Endpoint | Description |
|----------|-------------|
| `POST /admin/impersonate` | Generate short-lived JWT for a user |
| `POST /admin/users/{user_id}/role` | Set user role (admin/user/clinician) |

### Example: cURL Test

```bash
# Test dev admin access
curl -s 'https://api.defrag.app/dashboard' \
  -H 'Authorization: Bearer YOUR_32_CHAR_TOKEN'

# List users
curl -s 'https://api.defrag.app/admin/users' \
  -H 'Authorization: Bearer YOUR_32_CHAR_TOKEN'

# AI config status
curl -s 'https://api.defrag.app/admin/ai/config' \
  -H 'Authorization: Bearer YOUR_32_CHAR_TOKEN'
```

---

## Audit Logging

All dev admin actions are logged with:
- Timestamp (ISO 8601)
- Request path and method
- Email associated with dev admin
- For mutations: action type, target user ID, before/after values

Example log entries:
```
2026-01-05T21:50:00 [AUDIT] DEV_ADMIN: Access granted | path=/dashboard | method=GET | email=founder@defrag.app
2026-01-05T21:50:15 [AUDIT] ADMIN_MUTATION: impersonate | admin=founder@defrag.app | target_user_id=abc123 | target_email=user@example.com | duration_min=15
```

Logs are written to stdout and captured by Render's logging.

---

## Security Checklist

- [ ] Token is 32+ characters (use `openssl rand -hex 32`)
- [ ] Token is NOT `DEV_ADMIN` (old insecure string is rejected)
- [ ] Token is unique per environment (don't reuse staging token in prod)
- [ ] `SYNTH_DEV_ADMIN_ENABLED=false` is the default
- [ ] `SYNTH_ADMIN_MUTATIONS_ENABLED=false` unless impersonation is needed
- [ ] Disable immediately after emergency use in production
- [ ] Review audit logs periodically

---

## Troubleshooting

### "Dev Mode Disabled" on /dev
- Check `NEXT_PUBLIC_ENABLE_DEV=true` is set in Vercel/frontend env
- Redeploy frontend after changing env var

### "Invalid token" when entering token
- Ensure token matches `SYNTH_DEV_ADMIN_TOKEN` exactly
- Token must be 32+ characters
- The string `DEV_ADMIN` is rejected (legacy security fix)

### "Not authorized - admin role required"
- Dev admin user has `admin` role by default
- If seeing this, the token validation may have failed
- Check backend logs for `DEV_ADMIN: Attempted access` warnings

### Impersonation button says "Mutations disabled"
- Set `SYNTH_ADMIN_MUTATIONS_ENABLED=true` in backend env
- Redeploy backend

---

## Token Generation

Generate a secure token:

```bash
# Linux/macOS
openssl rand -hex 32

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output example: `a3f8b2c4d6e8f0a1b3c5d7e9f1a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8`

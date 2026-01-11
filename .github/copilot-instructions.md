# Copilot instructions (frags / defrag)

## Operating principles
- Keep diffs minimal and reversible.
- Prefer small, incremental commits.
- Run checks after changes (frontend: `npm run lint` + `npm run build`; backend: run tests if present).
- Do not add new dependencies unless explicitly requested.
- Never change production auth/billing behavior without an explicit task.

## Brand copy protection (NON-NEGOTIABLE)
- **COPY IS LOCKED.** Do not invent or rewrite brand voice, headlines, taglines, CTAs, or sayings.
- Canonical copy should be centralized (preferred: `frontend/src/content/oldWiseTales.ts`).
  - If this module does not exist yet, create it (do **not** inline new copy across pages).
- v0 is allowed to generate **layout and styling only** (sections, grids, spacing, subtle motion wrappers). v0 must not alter any strings.
- Fluid (voice) is allowed to add **interaction** (interruptible speech, SSE UX), but must not change copy.

### Protected phrases (must remain exact)
- "Old technology. Updated interface."
- "Initialize the Mirror"
- "Signal first. Action second."

### Wise-tales style sayings (allowed set)
Use only these sayings (or their explicitly-listed variations in the canonical copy module). Do not add new sayings.
- "To everything there is a season." → Timing Optimization
- "Reap what you sow." → Vector Stabilization
- "Iron sharpens iron." → Resonance Alignment
- "Still waters run deep." → Silence is valid data
- "Measure twice, cut once." → Signal before action
- "Don’t wake a sleeping dog." → Don’t force a closed loop
- "Where there’s smoke, there’s fire." → Pattern detection
- "Slow is smooth, smooth is fast." → Low-latency without forcing

### Drift triggers (must be removed if introduced)
Delete/replace any copy containing: transform, unlock, predict, diagnose, guarantee, optimize your life, dashboard insights, growth, hustle.

### Animation / visuals guardrails
- One ambient motion layer per surface. Prefer slow (20–40s) and subtle.
- Monochrome film look only (grain + fog + quiet plates). No colorful gradients.
- Motion communicates **state**, never hype.

## Engineering guardrails
- UI: Tailwind-only primitives are preferred. Avoid adding component libraries unless requested.
- Accessibility: respect `prefers-reduced-motion` and ensure text contrast remains high over plates.
- Security: agent actions must be allowlisted and pass-level gated; never execute arbitrary tools.
- Privacy: do not log sensitive user data; Spiral should store minimal event metadata.

## Work style
- When asked to change UI: propose changes, implement, then verify by building.
- When asked to change copy: only adjust canonical copy module and propagate imports.
- When unsure, add a `TODO:` note instead of inventing behavior.
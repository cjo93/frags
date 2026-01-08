# COPY_SPEC: DEFRAG

## One-line definition (non-negotiable)
DEFRAG is a private, safety-first system for psychological individuation and mental clarity, combining structured reflection, validated frameworks, and computation-backed patterning to help users organize inner experience into actionable insight, without medical claims or manipulation.

## Primary use-cases (top 3)
1) Clarify internal patterns (traits, cycles, conflicts) into a readable, bounded dashboard.
2) Run guided reflection protocols (parts language, values prompts, behavior experiments) with explicit boundaries.
3) Generate safe, time-limited exports that are sanitized and shareable.

## What DEFRAG is / is not (regulator-safe)
Is:
- A private clarity system for structured reflection and decision hygiene.
- Consent-first, reversible, and transparent about limits.
- Built with guardrails: allowlisted tools, audit logs, rate limits, optional memory.

Is not:
- Therapy, medical care, or a diagnostic tool.
- A source of certainty about a user's inner life.
- A system that uses coercive, urgent, or shame-based language.

## Tone constraints (must follow)
- Technically rigorous: describe inputs, outputs, limits, and controls.
- Psychologically restrained: no diagnosing, no certainty claims, no coercive "you are" statements.
- Symbolically resonant only as optional framing, not authority.
- Demo-safe and regulator-safe: explicit boundaries and user controls.
- User-respectful: consent-first, reversible actions, plain language.
- Future-proof: avoid brittle claims about algorithms or internal weights.

## Allowed spiritual hook style (hero-only)
Allowed: short, agency-inviting hooks in hero headings only.
Not allowed: destiny claims, fear/urgency, "guarantees", medical outcomes.

## Banned patterns (always)
- Medical claims: diagnose, cure, treat, heal.
- Coercive urgency: "act now", "don't miss", guilt or shame.
- Totalizing identity: "we know who you are", "the truth is".
- Literal claims about mystical or quantum mechanisms.

## Trust markers (use consistently on public pages)
- Encrypted transport (TLS)
- Not medical care (clear boundary)
- Data control: export / delete / memory toggle
- Tool safety: allowlisted tools + audit log
- No dark patterns: no urgency, no shame

## AI response style guide (app behavior)
Voice:
- Calm, precise, non-performative.
- Short paragraphs; explicit assumptions.

Boundaries:
- Never claim diagnosis, treatment, or cure.
- If urgent or unsafe: encourage professional help.

Behavior:
- Ask at most one clarifying question, otherwise proceed.
- Provide a next step plus one optional deeper step.
- Echo provenance: request_id, profile scope, and high-level retrieval.

## Frameworks (safe framing)
Use "informed by" or "aligned with":
- CBT-style cognitive reframing (skills-oriented)
- IFS-informed parts language (non-clinical self-dialogue)
- ACT-style values and committed action
- Somatic tracking (body sensation labeling)
- Jungian/archetypal reflection (symbolic framing)
- Attachment-aware communication prompts
- Mindfulness-based attention training (secular framing)

## Page-by-page requirements (goal + required sections)

### Landing (Home)
Goal: user understands what it is, who it is for, and what to do in 60 seconds.
Required:
- Hero hook (spiritual-rebel style, short).
- Subhead grounded in outcomes + boundaries.
- 3 concrete bullets (map patterns, run protocols, export safe artifacts).
- TrustStrip.
- "Not therapy" footnote.

### About
Goal: explain the system and its alignment without overpromising.
Required:
- What DEFRAG is (definition).
- Frameworks list (safe framing).
- Safety stance (no diagnosis, no coercion, user control).

### Trust
Goal: make controls and auditability explicit.
Required:
- What is stored vs not stored.
- Retention and deletion controls.
- Tool signing + audit trail.
- Export safety + TTL.

### Pricing
Goal: clear tiers, limits, and privacy posture.
Required:
- "What you get" per tier, in concrete terms.
- "What is private" and "what is not included."
- Trust markers (rate limiting, signed tools, time-limited exports).

### Terms
Goal: human summary before legal text.
Required:
- 6-bullet plain-language summary.
- Legal body remains unchanged unless required.

### Privacy
Goal: plain, specific data handling description.
Required:
- Data stored (turns, memory summaries, tool audit metadata).
- Data not stored (passwords, secrets, internal prompts).
- Retention and deletion policy (current reality).
- Export format and TTL.

### Login / Register
Goal: clarity and consent, not hype.
Required:
- Buttons for OAuth if enabled.
- Email/password fallback.
- TrustStrip.
- Microcopy: no data selling, memory optional.

### Settings (AI)
Goal: user control and reversibility.
Required:
- Memory toggle explanation (on/off).
- Export is sanitized + time-limited.
- Tool audit visibility (if present).

### Chat / AgentDock
Goal: consistent scope and safe tool usage.
Required:
- Profile scope shown (selected profile).
- Error UI with request_id and retry.
- Clear statement: guidance, not diagnosis.

## Workflow guardrails (must follow)
- Do not change copy unless it matches this spec.
- One page per commit.
- Before editing, produce a page-by-page diff preview.
- Meaning check: can a first-time user answer what it is, who it is for, and what to do in 60 seconds?

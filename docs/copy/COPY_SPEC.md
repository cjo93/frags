# Old Wise Tales Alignment Spec

> The thread's "north star" is the **old wise tales → modern interface translation system**.
> Anything that introduces a new "brand voice" outside that frame is drift.

---

## Brand Voice Rules

| Rule | Requirement |
|------|-------------|
| **Tone** | Calm, exact, reverent, non-preachy |
| **Rhythm** | Short lines, spacious, weighty |
| **Claims** | Reflection + patterning + timing context only |
| **Language** | signal / noise / seasons / alignment / coherence / mirror |
| **CTA** | Invitation, not urgency |

---

## Copy Anchors (NEVER CHANGE)

| Anchor | Text |
|--------|------|
| **Headline** | Old technology. Updated interface. |
| **Primary CTA** | Initialize the Mirror |
| **Microline** | Signal first. Action second. |
| **Trust line** | Not predictive. Not diagnostic. Built for clarity, pacing, and self-authored decisions. |

---

## The Old Sayings Table (Canonical)

**This table IS the entire brand.** Use these as section headers, tooltips, empty states, microcopy.

| Old saying | DEFRAG translation | Best placements |
|------------|-------------------|-----------------|
| To everything there is a season. | Timing Optimization | Hero, daily state, kairotic windows |
| Reap what you sow. | Vector Stabilization | Spiral, habit loops, outcomes |
| Iron sharpens iron. | Resonance Alignment | Constellations, sharing, mesh |
| Still waters run deep. | Silence is valid data | Empty states, "no action" moments |
| Measure twice, cut once. | Signal before action | Confirm/decline screens |
| Don't wake a sleeping dog. | Don't force a closed loop | Warnings, boundaries |
| Slow is smooth, smooth is fast. | Low latency without forcing | Coaching, UX microcopy |
| Where there's smoke… | Pattern detection | Spiral insights |

---

## What "Drift" Looks Like (Remove Everywhere)

### Delete/replace any copy that sounds like:
- "transform your life"
- "guaranteed breakthrough"
- "unlock your highest self"
- "predict"
- "diagnose"
- "we know what will happen"

### Also remove generic SaaS marketing language:
- "optimize" (except in the translation pairs)
- "insights dashboard"
- "productivity"
- "data-driven results"

You can still use "data" but as translator, not "growth analytics."

---

## Canonical Page Copy

### Landing (/)

**Hero**
- Eyebrow: `Old Technology`
- H1: `Old technology. Updated interface.`
- Subhead: `Defrag synthesizes ancient symbolic systems—Astrology, Human Design, Gene Keys—into structured self-reflection, so you can act with timing, not urgency.`
- Mantra rail rotates ONLY these pairs:
  - "To everything there is a season." → Timing Optimization
  - "Reap what you sow." → Vector Stabilization
  - "Iron sharpens iron." → Resonance Alignment
  - "Still waters run deep." → Silence is valid data
- Trust line (small): `Not predictive. Not diagnostic…`

### Trust (/trust)

Use only:
- "No silent actions."
- "Pass levels."
- "Spiral memory."
- "Data handling."

End with: `Structured self-reflection. Not predictive or diagnostic.`

### How it Works (/how-ai-works)

Frame as: **Capture → Synthesize → Propose → Learn**

Footer: `Not predictive. Not diagnostic. Not a substitute for professional care.`

### Pricing (/pricing)

- Title: `Upgrade for capacity, not status.`
- No "status", no "power", no "elite".

---

## Agent Copy (Critical)

### Proposal format (3 lines max)

1. **Observation:** "Pressure is elevated right now."
2. **Timing:** "A clearer window opens around 2:00 PM."
3. **Invitation:** "If you act, do one small thing: ice cream + silence."

### Decline response (one line)

```
Understood. Still waters run deep. No action required.
```

### PASSIVE day line

```
To everything there is a season. Today is for listening.
```

---

## Enforcement: Single Source of Truth

**Rule:** Marketing + microcopy must come from `src/content/*`. Layout generators (v0, agents) are allowed to generate layout only, not inline strings.

### Files:
- `frontend/src/content/oldWiseTales.ts` — sayings table
- `frontend/src/content/marketingCopy.ts` — page copy

Import from these files. Never hardcode marketing strings in components.

---

## Drift Audit Checklist

Search the repo for these phrases and remove:
- [ ] "transform"
- [ ] "predict"
- [ ] "diagnose"
- [ ] "optimize your life"
- [ ] "results"
- [ ] "insights dashboard"
- [ ] "unlock"

Then ensure every major surface includes at least one old-saying line.

---

## Tone Constraints

- **Technically rigorous:** describe inputs, outputs, limits, and controls.
- **Psychologically restrained:** no diagnosing, no certainty claims, no coercive "you are" statements.
- **Symbolically resonant** only as optional framing, not authority.
- **Demo-safe and regulator-safe:** explicit boundaries and user controls.
- **User-respectful:** consent-first, reversible actions, plain language.
- **Future-proof:** avoid brittle claims about algorithms or internal weights.

---

## Banned Patterns (Always)

- Medical claims: diagnose, cure, treat, heal.
- Coercive urgency: "act now", "don't miss", guilt or shame.
- Totalizing identity: "we know who you are", "the truth is".
- Literal claims about mystical or quantum mechanisms.

---

## Page-by-Page Requirements

### Landing (Home)
**Goal:** user understands what it is, who it is for, and what to do in 60 seconds.

Required:
- Hero hook (old-wise-tales style, short).
- Subhead grounded in outcomes + boundaries.
- Old sayings mantra rail.
- Trust line.
- "Not therapy" footnote.

### About
**Goal:** explain the system and its alignment without overpromising.

Required:
- What DEFRAG is (definition).
- Frameworks list (safe framing).
- Safety stance (no diagnosis, no coercion, user control).

### Trust
**Goal:** make controls and auditability explicit.

Required:
- What is stored vs not stored.
- Retention and deletion controls.
- Tool signing + audit trail.
- Export safety + TTL.

### Pricing
**Goal:** clear tiers, limits, and privacy posture.

Required:
- "What you get" per tier, in concrete terms.
- "What is private" and "what is not included."
- Trust markers (rate limiting, signed tools, time-limited exports).

### Terms
**Goal:** human summary before legal text.

Required:
- 6-bullet plain-language summary.
- Legal body remains unchanged unless required.

### Privacy
**Goal:** plain, specific data handling description.

Required:
- Data stored (turns, memory summaries, tool audit metadata).
- Data not stored (passwords, secrets, internal prompts).
- Retention and deletion policy (current reality).
- Export format and TTL.

---

## Workflow Guardrails

- Do not change copy unless it matches this spec.
- One page per commit.
- Before editing, produce a page-by-page diff preview.
- Meaning check: can a first-time user answer what it is, who it is for, and what to do in 60 seconds?

---

*Last updated: January 10, 2026*

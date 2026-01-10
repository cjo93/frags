# v0 Prompts (Marketing Pages)

Use these prompts in Vercel v0.
Rules:
- Do NOT let v0 rewrite copy or add claims.
- No new dependencies.
- Tailwind only.
- Premium minimal: soft gradients, hairlines, subtle surfaces, monochrome icons.
- Motion: one-time fade/translate; one ambient slow element only.

---

## Landing: Hero + First Band (/)
Paste target: `frontend/src/app/page.tsx` (replace hero + first band)

Generate a premium landing Hero + first section in React TSX using Tailwind only.

Constraints:
- Use EXACT copy below verbatim. Do not rewrite.
- No new dependencies.
- Premium minimal: soft gradients, hairlines, subtle surfaces, monochrome icons.
- Motion: one-time fade/translate on load; one ambient slow element only.
- Must render `<MandalaHero />` in the hero visual area.
- Must render `<RotatingMantras />` below the hero, as a calm "mantra rail".
- Responsive: 390px, 768px, 1440px.

Copy:
Eyebrow: "Old Technology"
H1: "Old technology. Updated interface."
Subhead: "Defrag synthesizes ancient symbolic systems—Astrology, Human Design, Gene Keys—into structured self-reflection, so you can act with timing, not urgency."
Microline: "Signal first. Action second."
Primary CTA: "Initialize the Mirror" -> /register
Secondary CTA: "See how it works" -> /how-ai-works

Section 2 Eyebrow: "A Mirror, Not a Mandate"
Three points:
Reflect — "Bring your inputs into a clean field — so you see signal before noise."
Stabilize — "Small adjustments that prevent drift and preserve coherence."
Align — "Choose people + environments that sharpen you — not drain you."

Output:
Return only TSX for the section(s), no imports.
Assume Link exists.

---

## Pricing (/pricing)
Paste target: `frontend/src/app/pricing/page.tsx`

Generate a premium Pricing page body in React TSX using Tailwind only.

Constraints:
- No new dependencies.
- No boxy bordered cards; use soft surfaces and hairlines.
- Subtle background orbs consistent with landing.
- Use EXACT copy verbatim.

H1: "Upgrade for capacity, not status."
Subhead: "Start free. Upgrade when signal matters."

Tiers:
Free: "Core reflection + profiles", "Daily orientation", "Spiral basics"
Pro: "Full synthesis (longer context, higher compute)", "Voice briefing", "Expanded Spiral"
Constellation: "Group dynamics + relational mapping", "Shared fields", "Event windows"

Footnote: "Defrag is for structured self-reflection. Not predictive. Not diagnostic."

CTAs:
Primary "Initialize the Mirror" -> /register
Secondary "Sign in" -> /login

Output TSX only.

---

## Trust (/trust)
Paste target: `frontend/src/app/(marketing)/trust/page.tsx`

Generate a premium Trust page body in React TSX using Tailwind only.

Constraints:
- No new dependencies.
- Calm, factual. No fear language.
- Visual cohesion with landing (orbs, hairlines, soft surfaces).
- Use EXACT copy verbatim.

H1: "Trust is design."
Subhead: "Defrag proposes. You decide."

Blocks:
"No silent actions." — "The agent can propose actions, but execution requires confirmation."
"Pass levels." — "On PASSIVE days, only audio + logging. Higher tiers unlock more, still guarded."
"Spiral memory." — "Accepted/declined proposals are logged so the system adapts without nagging."
"Data handling." — "We do not sell your data. Access is controlled. You can request deletion."

Footer: "Structured self-reflection. Not predictive or diagnostic."

Output TSX only.

---

## About (/about)
Paste target: `frontend/src/app/(marketing)/about/page.tsx`

Generate a premium About/Manifesto page body in React TSX using Tailwind only.

Constraints:
- Preserve whitespace and rhythm; short paragraphs.
- Visual cohesion: faint orbs, hairlines, no boxes.
- Use EXACT text verbatim. Do not rewrite.

Title: "This is Old Technology."
Lines:
"We did not invent the signal. We are simply fixing the receiver."
"For five thousand years, human beings knew how to read the room. We knew that there was a time to plant and a time to harvest. We knew that silence had weight."
"We called it wisdom. We called it intuition. We called it grace. It was a technology of the soul — a way of moving through the world without breaking it."
"And then, we forgot. We built a world of bright screens and constant noise that drowned out the signal."
"DEFRAG is the Update."
"The signal has been heard. The update is ready."

CTA: "Initialize the Mirror" -> /register

Output TSX only.

---

## How it works (/how-ai-works)
Paste target: `frontend/src/app/how-ai-works/page.tsx`

Generate a premium How it works page body in React TSX using Tailwind only.

Constraints:
- No hype. No promises.
- Add a simple diagram-like SVG or HTML line system (monochrome).
- Visual cohesion with landing.
- Use EXACT copy verbatim.

H1: "A mirror, not a mandate."
Subhead: "Defrag turns inputs into orientation."

Steps:
Capture — "You log what matters: mood, friction, decisions, events."
Synthesize — "Frameworks act as structured lenses. Output is a calm readout."
Propose — "The agent proposes actions. You confirm or decline."
Learn — "Spiral logs outcomes so prompts adapt over time."

Footer: "Not predictive. Not diagnostic. Not a substitute for professional care."

Output TSX only.

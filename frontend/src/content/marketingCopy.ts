/**
 * Marketing Copy — Single Source of Truth
 * 
 * All marketing text must come from this file.
 * v0/agents can generate layout only, not inline strings.
 * 
 * Brand voice rules:
 * - Tone: calm, exact, reverent, non-preachy
 * - Rhythm: short lines, spacious, weighty
 * - Claims: reflection + patterning + timing context only
 * - Language: signal / noise / seasons / alignment / coherence / mirror
 * - CTA: invitation, not urgency
 */

// ============================================
// ANCHORS (never change)
// ============================================

export const ANCHORS = {
  headline: "Old technology. Updated interface.",
  primaryCTA: "Initialize the Mirror",
  secondaryCTA: "See how it works",
  microline: "Signal first. Action second.",
  trustLine: "Not predictive. Not diagnostic. Built for clarity, pacing, and self-authored decisions.",
  notMedical: "Not a substitute for professional mental health care, therapy, or medical advice.",
} as const;

// ============================================
// LANDING PAGE (/)
// ============================================

export const LANDING = {
  hero: {
    eyebrow: "Old Technology",
    headline: ANCHORS.headline,
    subhead: "Defrag synthesizes ancient symbolic systems—Astrology, Human Design, Gene Keys—into structured self-reflection, so you can act with timing, not urgency.",
    chips: ["Astrology", "Human Design", "Gene Keys"],
    chipsTagline: "— lenses, not labels",
  },
  
  sections: {
    mirror: {
      title: "A Mirror, Not a Mandate",
      items: [
        { title: "Reflect", description: "Bring your inputs into a clean field — so you see signal before noise." },
        { title: "Stabilize", description: "Small adjustments that prevent drift and preserve coherence." },
        { title: "Align", description: "Choose people + environments that sharpen you — not drain you." },
      ],
    },
    
    howItWorks: {
      title: "A calm loop: capture, synthesize, return signal.",
      subtitle: "Defrag uses symbolic frameworks as structured lenses. The output is orientation — not orders.",
      steps: [
        { step: "01", title: "Capture", description: "Log what matters: friction, mood, decisions, and moments that carry weight." },
        { step: "02", title: "Synthesize", description: "The engine organizes inputs across time and relationship geometry to reduce noise." },
        { step: "03", title: "Return signal", description: "You get a calm readout: what's clear, what's fogged, what's overheated — without forcing action." },
      ],
    },
  },
  
  disclaimers: {
    notMedical: {
      title: "Not Medical Advice",
      text: "Defrag is a tool for self-reflection and structured exploration. It is not a substitute for professional mental health care, therapy, or medical advice. If you are in crisis, please contact a qualified professional.",
    },
    yourData: {
      title: "Your Data",
      text: "Your data is protected in transit and access-controlled at rest. We do not sell your data or share it across users. Exports are time-limited, and you can request deletion at any time.",
    },
  },
} as const;

// ============================================
// TRUST PAGE (/trust)
// ============================================

export const TRUST = {
  title: "Trust & Safety",
  subtitle: "Structured self-reflection. Not predictive or diagnostic.",
  
  principles: [
    { title: "No silent actions", description: "Every tool action is logged and auditable." },
    { title: "Pass levels", description: "The system scales response intensity based on context." },
    { title: "Spiral memory", description: "Memory is optional, bounded, and deletable." },
    { title: "Data handling", description: "Encrypted in transit, access-controlled at rest, exportable on demand." },
  ],
  
  footer: ANCHORS.trustLine,
} as const;

// ============================================
// HOW IT WORKS (/how-ai-works)
// ============================================

export const HOW_IT_WORKS = {
  title: "How Defrag Works",
  
  flow: [
    { step: "Capture", description: "You log reflections, decisions, and friction points." },
    { step: "Synthesize", description: "The engine cross-references symbolic frameworks and your history." },
    { step: "Propose", description: "You receive timing-aware, non-coercive suggestions." },
    { step: "Learn", description: "Your feedback refines future proposals." },
  ],
  
  footer: "Not predictive. Not diagnostic. Not a substitute for professional care.",
} as const;

// ============================================
// PRICING (/pricing)
// ============================================

export const PRICING = {
  title: "Upgrade for capacity, not status.",
  subtitle: "All plans include the core reflection engine. Higher tiers add profiles, constellations, and priority support.",
  
  tiers: [
    {
      name: "Insight",
      subtitle: "Personal",
      price: "$9",
      period: "/month",
      features: [
        "1 profile (you)",
        "Daily reflection prompts",
        "Timing context",
        "Export your data",
      ],
    },
    {
      name: "Integration",
      subtitle: "Multi-profile",
      price: "$19",
      period: "/month",
      popular: true,
      features: [
        "Up to 5 profiles",
        "Everything in Insight",
        "Relationship geometry",
        "Priority support",
      ],
    },
    {
      name: "Constellation",
      subtitle: "Relational",
      price: "$29",
      period: "/month",
      features: [
        "Unlimited profiles",
        "Everything in Integration",
        "Team/family constellations",
        "API access",
      ],
    },
  ],
} as const;

// ============================================
// AUTH PAGES
// ============================================

export const AUTH = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to continue",
  },
  register: {
    title: "Create your account",
    subtitle: "Start with a 7-day free trial",
  },
  forgotPassword: {
    title: "Reset your password",
    subtitle: "We'll send a code to your email",
  },
  microcopy: {
    noDataSelling: "We do not sell your data.",
    memoryOptional: "Memory is optional and deletable.",
  },
} as const;

// ============================================
// FOOTER
// ============================================

export const FOOTER = {
  brand: "DEFRAG",
  tagline: "Structured self-reflection. Not predictive. Not diagnostic.",
  links: ["Privacy", "Trust", "How it works"],
} as const;

// ============================================
// DRIFT PHRASES (never use these)
// ============================================

export const BANNED_PHRASES = [
  "transform your life",
  "guaranteed breakthrough",
  "unlock your highest self",
  "predict",
  "diagnose",
  "we know what will happen",
  "optimize your life",
  "insights dashboard",
  "productivity",
  "data-driven results",
  "unlock",
  "transform",
  "results",
] as const;

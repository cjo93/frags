/**
 * Old Wise Tales — Canonical Sayings Table
 * 
 * This is the ENTIRE brand. Do not edit without product owner approval.
 * These pairs bridge ancient wisdom to modern terminology.
 */

export interface WiseTale {
  saying: string;
  translation: string;
  placements: string[];
}

export const OLD_WISE_TALES: WiseTale[] = [
  {
    saying: "To everything there is a season.",
    translation: "Timing Optimization",
    placements: ["hero", "daily state", "kairotic windows"],
  },
  {
    saying: "Reap what you sow.",
    translation: "Vector Stabilization",
    placements: ["spiral", "habit loops", "outcomes"],
  },
  {
    saying: "Iron sharpens iron.",
    translation: "Resonance Alignment",
    placements: ["constellations", "sharing", "mesh"],
  },
  {
    saying: "Still waters run deep.",
    translation: "Silence is valid data",
    placements: ["empty states", "no action moments"],
  },
  {
    saying: "Measure twice, cut once.",
    translation: "Signal before action",
    placements: ["confirm/decline screens"],
  },
  {
    saying: "Don't wake a sleeping dog.",
    translation: "Don't force a closed loop",
    placements: ["warnings", "boundaries"],
  },
  {
    saying: "Slow is smooth, smooth is fast.",
    translation: "Low latency without forcing",
    placements: ["coaching", "UX microcopy"],
  },
  {
    saying: "Where there's smoke…",
    translation: "Pattern detection",
    placements: ["spiral insights"],
  },
];

/**
 * Hero mantras — these are the only ones that rotate on landing
 */
export const HERO_MANTRAS = OLD_WISE_TALES.slice(0, 4).map(t => ({
  saying: t.saying,
  translation: t.translation,
}));

/**
 * Get a wise tale by context
 */
export function getWiseTaleFor(placement: string): WiseTale | undefined {
  return OLD_WISE_TALES.find(t => t.placements.includes(placement));
}

/**
 * Empty state line
 */
export const EMPTY_STATE_LINE = "Still waters run deep.";

/**
 * Decline response (agent)
 */
export const DECLINE_RESPONSE = "Understood. Still waters run deep. No action required.";

/**
 * Passive day line (agent)
 */
export const PASSIVE_DAY_LINE = "To everything there is a season. Today is for listening.";

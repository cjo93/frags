/**
 * Design System Tokens
 * 
 * Minimal, editorial design language.
 * No loud colors. No gamification. Confidence through restraint.
 */

// Typography Scale (based on 1.25 ratio)
export const typography = {
  // Display - for hero text
  display: 'text-5xl md:text-6xl font-light tracking-tight',
  
  // Headings
  h1: 'text-3xl md:text-4xl font-light tracking-tight',
  h2: 'text-2xl md:text-3xl font-light tracking-tight',
  h3: 'text-xl md:text-2xl font-normal',
  h4: 'text-lg font-medium',
  
  // Body
  body: 'text-base font-normal leading-relaxed',
  bodyLarge: 'text-lg font-normal leading-relaxed',
  bodySmall: 'text-sm font-normal leading-relaxed',
  
  // UI
  label: 'text-sm font-medium tracking-wide uppercase',
  caption: 'text-xs font-normal text-neutral-500',
  mono: 'font-mono text-sm',
};

// Spacing Scale (4px base)
export const spacing = {
  px: '1px',
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
};

// Colors - Neutral palette only
export const colors = {
  // Backgrounds
  bg: {
    primary: 'bg-white dark:bg-neutral-950',
    secondary: 'bg-neutral-50 dark:bg-neutral-900',
    tertiary: 'bg-neutral-100 dark:bg-neutral-800',
    inverse: 'bg-neutral-900 dark:bg-white',
  },
  
  // Text
  text: {
    primary: 'text-neutral-900 dark:text-neutral-50',
    secondary: 'text-neutral-600 dark:text-neutral-400',
    tertiary: 'text-neutral-400 dark:text-neutral-500',
    inverse: 'text-white dark:text-neutral-900',
    accent: 'text-neutral-900 dark:text-white',
  },
  
  // Borders
  border: {
    default: 'border-neutral-200 dark:border-neutral-800',
    subtle: 'border-neutral-100 dark:border-neutral-900',
    strong: 'border-neutral-300 dark:border-neutral-700',
  },
};

// Button Styles
export const button = {
  // Primary - filled
  primary: `
    inline-flex items-center justify-center
    px-6 py-3
    bg-neutral-900 dark:bg-white
    text-white dark:text-neutral-900
    text-sm font-medium tracking-wide
    rounded-none
    transition-opacity duration-150
    hover:opacity-80
    focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2
    disabled:opacity-40 disabled:cursor-not-allowed
  `,
  
  // Secondary - outlined
  secondary: `
    inline-flex items-center justify-center
    px-6 py-3
    bg-transparent
    text-neutral-900 dark:text-white
    text-sm font-medium tracking-wide
    border border-neutral-300 dark:border-neutral-700
    rounded-none
    transition-all duration-150
    hover:bg-neutral-100 dark:hover:bg-neutral-800
    focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2
    disabled:opacity-40 disabled:cursor-not-allowed
  `,
  
  // Ghost - minimal
  ghost: `
    inline-flex items-center justify-center
    px-4 py-2
    bg-transparent
    text-neutral-600 dark:text-neutral-400
    text-sm font-medium
    rounded-none
    transition-colors duration-150
    hover:text-neutral-900 dark:hover:text-white
    focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2
    disabled:opacity-40 disabled:cursor-not-allowed
  `,
  
  // Link style
  link: `
    inline-flex items-center
    text-neutral-900 dark:text-white
    text-sm font-medium
    underline underline-offset-4
    transition-opacity duration-150
    hover:opacity-70
    focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white
  `,
};

// Card Styles
export const card = {
  default: `
    bg-white dark:bg-neutral-900
    border border-neutral-200 dark:border-neutral-800
    p-6
  `,
  elevated: `
    bg-white dark:bg-neutral-900
    border border-neutral-200 dark:border-neutral-800
    shadow-sm
    p-6
  `,
};

// Input Styles
export const input = {
  default: `
    w-full
    px-4 py-3
    bg-white dark:bg-neutral-900
    text-neutral-900 dark:text-white
    placeholder-neutral-400 dark:placeholder-neutral-600
    border border-neutral-300 dark:border-neutral-700
    rounded-none
    text-base
    transition-colors duration-150
    focus:outline-none focus:border-neutral-900 dark:focus:border-white
    disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
  `,
};

// Layout helpers
export const layout = {
  container: 'max-w-5xl mx-auto px-6',
  containerWide: 'max-w-7xl mx-auto px-6',
  containerNarrow: 'max-w-2xl mx-auto px-6',
  section: 'py-16 md:py-24',
  sectionSmall: 'py-8 md:py-12',
};

// Animation - subtle only
export const motion = {
  fadeIn: 'animate-in fade-in duration-300',
  slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
  // No bouncy or attention-grabbing animations
};

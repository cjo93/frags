'use client';

import Link from 'next/link';
import RotatingMantras from '@/components/RotatingMantras';
import MandalaHero from '@/components/MandalaHero';
import { SiteHeader, SiteFooter, FilmBackdrop, Section, Hairline } from '@/components/marketing';
import { HERO_MANTRAS } from '@/content/oldWiseTales';

// Use canonical mantras from single source of truth
const MANTRAS = HERO_MANTRAS.map(m => ({
  saying: m.saying,
  translation: `${m.translation}.`,
}));

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Hero */}
      <Section className="bg-white dark:bg-black">
        <FilmBackdrop src="/hero/field.webp" />

        <div className="relative grid gap-12 lg:grid-cols-2 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
              Old Technology
            </p>

            <h1 className="mt-5 text-5xl md:text-7xl font-light tracking-tight leading-[1.05] text-neutral-900 dark:text-neutral-50">
              Old technology. Updated interface.
            </h1>

            <p className="mt-7 text-lg md:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Defrag synthesizes ancient symbolic systems—Astrology, Human Design, Gene Keys—into structured
              self-reflection, so you can act with timing, not urgency.
            </p>

            {/* Framework chips */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="inline-flex items-center rounded-full bg-neutral-900/[0.03] dark:bg-white/[0.06] border border-neutral-200/60 dark:border-neutral-700/40 px-3.5 py-1.5 backdrop-blur-sm">
                Astrology
              </span>
              <span className="inline-flex items-center rounded-full bg-neutral-900/[0.03] dark:bg-white/[0.06] border border-neutral-200/60 dark:border-neutral-700/40 px-3.5 py-1.5 backdrop-blur-sm">
                Human Design
              </span>
              <span className="inline-flex items-center rounded-full bg-neutral-900/[0.03] dark:bg-white/[0.06] border border-neutral-200/60 dark:border-neutral-700/40 px-3.5 py-1.5 backdrop-blur-sm">
                Gene Keys
              </span>
              <span className="ml-2 hidden sm:inline text-neutral-400 dark:text-neutral-500 italic">
                — lenses, not labels
              </span>
            </div>

            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              Signal first. Action second.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Initialize the Mirror
              </Link>
              <Link
                href="/how-ai-works"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200 hover:border-neutral-300 dark:hover:border-neutral-600"
              >
                See how it works
              </Link>
            </div>

            {/* Premium divider */}
            <Hairline className="mt-10 max-w-md" />

            <p className="mt-6 text-xs text-neutral-600 dark:text-neutral-400 max-w-md leading-relaxed">
              Not predictive. Not diagnostic. Built for clarity, pacing, and self-authored decisions.
            </p>
          </div>

          {/* Right: Visual panel */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-tr from-neutral-200/40 via-transparent to-neutral-100/20 blur-3xl dark:from-neutral-700/20 dark:to-neutral-800/10" />

            <div className="relative overflow-hidden rounded-[1.75rem] shadow-2xl shadow-neutral-900/[0.08] dark:shadow-black/30">
              <img
                src="/hero/constellation.webp"
                alt=""
                className="h-[380px] w-full object-cover opacity-[0.28] dark:opacity-[0.18] scale-[1.05] film-kenburns"
                style={{ animation: "kenburns 34s ease-in-out infinite" }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/70 via-white/20 to-transparent dark:from-black/70 dark:via-black/20" />
              <div className="absolute inset-0 ring-1 ring-inset ring-neutral-200/50 dark:ring-neutral-700/50" />

              {/* Mandala overlay (kept subtle) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[220px] h-[220px] opacity-[0.92]">
                  <MandalaHero state="CLEAR" />
                </div>
              </div>
            </div>

            {/* Small caption */}
            <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
              Pattern recognition across people, time, and relationships.
            </p>
          </div>
        </div>

        {/* Mantra rail */}
        <div className="relative mt-16">
          <RotatingMantras mantras={MANTRAS} />
        </div>
      </Section>

      {/* Insight / Premium Feature band */}
      <section className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center space-y-10">
          <p className="text-sm uppercase text-neutral-500 dark:text-neutral-400 tracking-widest">
            A Mirror, Not a Mandate
          </p>

          <div className="grid md:grid-cols-3 gap-10 text-left">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-white/60 dark:bg-black/20 shadow-[0_1px_0_rgba(0,0,0,0.04)]" />
              <div className="relative p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 3v18" opacity="0.35" />
                      <path d="M5 12h14" opacity="0.35" />
                      <path d="M7 7c4-2 6-2 10 0" />
                      <path d="M7 17c4 2 6 2 10 0" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
                    Reflect
                  </h3>
                </div>
                <p className="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Bring your inputs into a clean field — so you see signal before noise.
                </p>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-white/60 dark:bg-black/20 shadow-[0_1px_0_rgba(0,0,0,0.04)]" />
              <div className="relative p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 2c3 3 5 6 5 10a5 5 0 1 1-10 0c0-4 2-7 5-10Z" />
                      <path d="M9.5 13.2c.8 1.2 1.7 1.8 2.5 1.8s1.7-.6 2.5-1.8" opacity="0.6" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
                    Stabilize
                  </h3>
                </div>
                <p className="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Small adjustments that prevent drift and preserve coherence.
                </p>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-white/60 dark:bg-black/20 shadow-[0_1px_0_rgba(0,0,0,0.04)]" />
              <div className="relative p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 12c4-7 12-7 16 0" />
                      <path d="M6 12c3-5 9-5 12 0" opacity="0.6" />
                      <path d="M8 12c2-3 6-3 8 0" opacity="0.35" />
                      <path d="M12 13v7" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
                    Align
                  </h3>
                </div>
                <p className="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Choose people + environments that sharpen you — not drain you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10rem] top-10 h-80 w-80 rounded-full bg-gradient-to-tr from-neutral-200/35 to-transparent blur-3xl dark:from-neutral-700/15" />
          <div className="absolute right-[-12rem] bottom-[-6rem] h-96 w-96 rounded-full bg-gradient-to-tl from-neutral-200/30 to-transparent blur-3xl dark:from-neutral-700/10" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-sm uppercase text-neutral-500 dark:text-neutral-400 tracking-widest">
              How it works
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-light tracking-tight text-neutral-900 dark:text-neutral-50">
              A calm loop: capture, synthesize, return signal.
            </h2>
            <p className="mt-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Defrag uses symbolic frameworks as structured lenses. The output is orientation — not orders.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/30" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Step 01</p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M7 7h10M7 12h10M7 17h6" />
                      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" opacity="0.35" />
                    </svg>
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-neutral-900 dark:text-neutral-50">Capture</h3>
                <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Log what matters: friction, mood, decisions, and moments that carry weight.
                </p>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/30" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Step 02</p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 12h16" opacity="0.35" />
                      <path d="M7 7c4-3 6-3 10 0" />
                      <path d="M7 17c4 3 6 3 10 0" />
                    </svg>
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-neutral-900 dark:text-neutral-50">Synthesize</h3>
                <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  The engine organizes inputs across time and relationship geometry to reduce noise.
                </p>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/30" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Step 03</p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 21V3" opacity="0.35" />
                      <path d="M5 10c5 2 9 2 14 0" />
                      <path d="M6 14c4 2 8 2 12 0" opacity="0.7" />
                    </svg>
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-neutral-900 dark:text-neutral-50">Return signal</h3>
                <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  You get a calm readout: what’s clear, what’s fogged, what’s overheated — without forcing action.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col sm:flex-row gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Initialize the Mirror
            </Link>
            <Link
              href="/how-ai-works"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/30" />
              <div className="relative p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 2a7 7 0 0 0-4 12v4l4-2 4 2v-4a7 7 0 0 0-4-12Z" opacity="0.35" />
                      <path d="M10.5 10.5h3" />
                      <path d="M12 9v5" />
                    </svg>
                  </span>
                  <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Not Medical Advice
                  </h4>
                </div>
                <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Defrag is a tool for self-reflection and structured exploration. It is not a substitute
                  for professional mental health care, therapy, or medical advice. If you are in crisis,
                  please contact a qualified professional.
                </p>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/30" />
              <div className="relative p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/5 dark:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4Z" opacity="0.35" />
                      <path d="M9 12l2 2 4-5" />
                    </svg>
                  </span>
                  <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Your Data
                  </h4>
                </div>
                <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Your data is protected in transit and access-controlled at rest. We do not sell your data or
                  share it across users. Exports are time-limited, and you can request deletion at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
    </>
  );
}

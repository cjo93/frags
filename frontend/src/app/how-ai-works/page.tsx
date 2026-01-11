'use client';

import Link from 'next/link';
import { SiteHeader, SiteFooter, FilmBackdrop, Section } from '@/components/marketing';

// Note: metadata export requires removing 'use client' and moving to a separate file
// For now, we rely on the root layout's metadata

export default function HowAIWorksPage() {

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-white dark:bg-black">
        {/* Hero */}
        <Section className="relative text-center">
          <FilmBackdrop src="/hero/spiral.webp" />
          <div className="relative">
            <p className="fade-up text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-4">
              How it works
            </p>
            <h1 className="fade-up fade-up-2 text-4xl md:text-5xl font-light tracking-tight">
              A mirror, not a mandate.
            </h1>
            <p className="fade-up fade-up-3 mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
              Defrag turns inputs into orientation—using deterministic computation and optional AI interpretation.
            </p>
          </div>
        </Section>

      {/* Flow Diagram */}
      <section className="fade-up max-w-4xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-4 gap-6 md:gap-4">
          {/* Step 1 */}
          <div className="hover-lift text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <div className="hidden md:block h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
            <h3 className="text-sm font-medium">Capture</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Log what matters: mood, friction, decisions.
            </p>
          </div>

          {/* Step 2 */}
          <div className="hover-lift text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.572.095a9.031 9.031 0 01-6.563-.89" />
              </svg>
            </div>
            <div className="hidden md:block h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
            <h3 className="text-sm font-medium">Synthesize</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Frameworks act as lenses. Output is a calm readout.
            </p>
          </div>

          {/* Step 3 */}
          <div className="hover-lift text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div className="hidden md:block h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
            <h3 className="text-sm font-medium">Propose</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              The agent proposes. You confirm or decline.
            </p>
          </div>

          {/* Step 4 */}
          <div className="hover-lift text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <div className="hidden md:block h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
            <h3 className="text-sm font-medium">Learn</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Spiral logs outcomes. Prompts adapt over time.
            </p>
          </div>
        </div>
      </section>

      {/* Two Layers Visual */}
      <section className="fade-up bg-neutral-50 dark:bg-neutral-900 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Deterministic */}
            <div className="hover-lift space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">⚙</span>
              </div>
              <h3 className="text-lg font-medium">Deterministic Layer</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Charts, numerology, Human Design — computed with established algorithms. 
                Reproducible. Auditable. No AI.
              </p>
            </div>

            {/* AI */}
            <div className="hover-lift space-y-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-indigo-600 dark:text-indigo-400 text-lg">◇</span>
              </div>
              <h3 className="text-lg font-medium">Interpretation Layer</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                AI explains and connects computed data. It never invents placements 
                or generates predictions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Boundaries */}
      <section className="fade-up max-w-4xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Does */}
          <div>
            <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">AI does</h3>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Explain computed patterns
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Connect across frameworks
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Cite source placements
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Transcribe voice notes
              </li>
            </ul>
          </div>

          {/* Doesn't */}
          <div>
            <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-4">AI doesn&apos;t</h3>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-2">
                <span className="text-red-500">✗</span> Invent chart data
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✗</span> Make predictions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✗</span> Provide medical/financial advice
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✗</span> Access data outside your profile
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Not predictive. Not diagnostic. Not a substitute for professional care.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="hover-lift inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Initialize the Mirror
            </Link>
            <Link
              href="/trust"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200"
            >
              Trust &amp; Safety
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
    </>
  );
}

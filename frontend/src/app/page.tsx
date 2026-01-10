'use client';

import Link from 'next/link';
import TrustStrip from '@/components/TrustStrip';
import LegalFooter from '@/components/LegalFooter';
import RotatingMantras from '@/components/RotatingMantras';
import MandalaHero from '@/components/MandalaHero';

const MANTRAS = [
  { saying: "To everything there is a season.", translation: "Timing Optimization." },
  { saying: "Reap what you sow.", translation: "Vector Stabilization." },
  { saying: "Iron sharpens iron.", translation: "Resonance Alignment." },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              href="/pricing" 
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/how-ai-works"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/trust"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Trust
            </Link>
            <Link 
              href="/login" 
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Enter the Field
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 flex flex-col lg:flex-row items-center gap-10">
          {/* Hero Text */}
          <div className="lg:w-1/2 space-y-6">
            <h1 className="text-5xl md:text-6xl font-light tracking-tight leading-tight text-neutral-900 dark:text-neutral-50">
              Old Technology. Updated Interface.
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Defrag synthesizes symbolic frameworks into structured self-reflection — so you can act with timing, not urgency.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Signal first. Action second.</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                Initialize the Mirror
              </Link>
              <Link
                href="/how-ai-works"
                className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                See how it works
              </Link>
            </div>
            <TrustStrip className="mt-6" />
          </div>

          {/* Hero Visual */}
          <div className="lg:w-1/2 flex justify-center">
            <MandalaHero state="CLEAR" />
          </div>
        </div>
      </section>

      {/* Insight / Premium Feature band */}
      <section className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center space-y-10">
          <p className="text-sm uppercase text-neutral-500 dark:text-neutral-400 tracking-widest">
            A Mirror, Not a Mandate
          </p>
          <RotatingMantras mantras={MANTRAS} />

          <div className="grid md:grid-cols-3 gap-12 text-left">
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-3">
                Reflect
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Bring your inputs into a clean field — so you see signal before noise.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-3">
                Stabilize
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Small adjustments that prevent drift and preserve coherence.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-3">
                Align
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Choose people + environments that sharpen you — not drain you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Not Medical Advice
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed">
                Defrag is a tool for self-reflection and structured exploration. It is not a substitute
                for professional mental health care, therapy, or medical advice. If you are in crisis,
                please contact a qualified professional.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Your Data
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed">
                Your data is protected in transit and access-controlled at rest. We do not sell your data or
                share it across users. Exports are time-limited, and you can request deletion at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LegalFooter className="border-t-0" />
    </main>
  );
}

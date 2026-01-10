import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col">
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

      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">
          A system for individuation, not identity.
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Defrag is built around attention, continuity, and choice. It aligns with evidence-based
          psychological practice without impersonating clinical care.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24 space-y-12">
        <div>
          <h2 className="text-xl font-medium mb-3">What we focus on</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Reflection, values, pattern recognition, and safe action planning. We operate in the
            language of systems: inputs, outputs, limits, and consent.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-3">Framework alignment</h2>
          <ul className="space-y-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <li>
              <strong className="text-neutral-900 dark:text-white">Cognitive & behavioral:</strong>{' '}
              CBT-aligned reframing and planning prompts (non-clinical, user-directed).
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-white">Acceptance & values:</strong>{' '}
              ACT-style values clarification and committed action.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-white">Parts language:</strong>{' '}
              IFS-adjacent “parts” framing without therapeutic claims.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-white">Somatic cues:</strong>{' '}
              body awareness prompts for regulation and pacing.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-white">Depth & meaning:</strong>{' '}
              Jung-adjacent individuation and symbolic reflection as metaphor.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-3">Safety stance</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            No diagnosis. No coercion. Clear boundaries and user control. Defrag supports reflection
            and organization; it is not therapy or medical advice.
          </p>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

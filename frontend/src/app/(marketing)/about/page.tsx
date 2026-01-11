import type { Metadata } from 'next';
import { SiteHeader, SiteFooter, FilmBackdrop, Section } from '@/components/marketing';

export const metadata: Metadata = {
  title: "About — Individuation Through Symbolic Frameworks",
  description: "Defrag aligns with CBT, ACT, IFS, and Jungian frameworks for structured self-reflection. Evidence-based psychology meets ancient symbolic systems.",
  openGraph: {
    title: "About Defrag — Psychology-Aligned Self-Reflection",
    description: "Evidence-based frameworks for self-understanding. Not therapy, not prediction—structured reflection.",
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen flex flex-col bg-white dark:bg-black">
        <Section className="relative">
          <FilmBackdrop src="/hero/field.webp" opacityClassName="opacity-[0.14] dark:opacity-[0.10]" />
          <div className="relative">
            <h1 className="fade-up text-3xl md:text-4xl font-light tracking-tight">
              A system for individuation, not identity.
            </h1>
            <p className="fade-up fade-up-2 mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Defrag synthesizes ancient symbolic systems with evidence-based psychological frameworks—
              without impersonating clinical care.
            </p>
          </div>
        </Section>

        <section className="fade-up max-w-4xl mx-auto px-6 pb-24 space-y-12">
        <div>
          <h2 className="text-xl font-medium mb-3">What we focus on</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Reflection, values clarification, pattern recognition, and intentional action planning.
            We operate in the language of systems: inputs, outputs, limits, and consent.
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

      <SiteFooter />
    </main>
    </>
  );
}

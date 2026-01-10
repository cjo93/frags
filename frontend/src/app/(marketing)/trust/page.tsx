import TrustStrip from '@/components/TrustStrip';
import { SiteHeader, SiteFooter, FilmBackdrop, Section } from '@/components/marketing';

export default function TrustPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen flex flex-col bg-white dark:bg-black">
        <Section className="relative">
          <FilmBackdrop src="/hero/constellation.webp" />
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight">Trust is engineered.</h1>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Defrag is built to be auditable, scoped, and reversible. Controls are explicit and designed
              for safe real-world use.
            </p>
            <TrustStrip className="mt-8" />
          </div>
        </Section>

        <section className="max-w-4xl mx-auto px-6 pb-24 space-y-12">
        <div>
          <h2 className="text-xl font-medium mb-3">Data control</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            You control memory, exports, and deletion. Memory can be disabled at any time. Exports are
            sanitized and delivered via time-limited links.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-3">System controls</h2>
          <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
            <li>Rate limiting and concurrency caps per user.</li>
            <li>Request IDs propagated end-to-end for auditability.</li>
            <li>Tool calls are signed and recorded in an audit trail.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-3">Least privilege</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Only allow-listed tools can be invoked. Tool inputs are validated, and server-side
            authorization ensures data is scoped to the authenticated user.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-3">Redaction & export safety</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Safe exports remove sensitive fields and internal metadata. Signed URLs expire quickly and
            are scoped to a single artifact.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
              Signed + Audited
            </span>
            <span className="px-3 py-1 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
              Sanitized Export
            </span>
            <span className="px-3 py-1 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
              Time-limited Download
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-3">Reliability</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Deterministic pipelines produce the same outputs for the same inputs. Guardrails are
            enforced at the edge and the backend to prevent abuse.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
    </>
  );
}

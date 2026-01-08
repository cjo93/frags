import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Privacy
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
          </div>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">Terms of service.</h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          A plain-language summary appears first. The full terms follow.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-10">
        <div className="border border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-600 dark:text-neutral-400 space-y-3">
          <p>Defrag provides software for reflection and organization.</p>
          <p>It is not therapy, medical advice, or a medical device.</p>
          <p>You control memory and exports; actions are reversible.</p>
          <p>We limit abuse and protect availability with rate limits and audits.</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24 space-y-8 text-neutral-600 dark:text-neutral-400 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">Use of the service</h2>
          <p>
            You agree to use the service lawfully and not to abuse, probe, or interfere with system
            availability. We may suspend access if abuse is detected.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all
            activity under your account.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">Limitations</h2>
          <p>
            The service provides informational content for reflection and planning. It is not a
            substitute for professional care.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">Changes</h2>
          <p>
            We may update these terms and will post the latest version here. Continued use indicates
            acceptance of updated terms.
          </p>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

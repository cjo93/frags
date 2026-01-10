import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: "Privacy Policy — Data Control and Transparency",
  description: "Your data stays yours. Control memory, request exports, delete anytime. Defrag stores only what's needed for continuity.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-black">
      <header className="border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-[0.15em] text-neutral-900 dark:text-neutral-50 hover:opacity-70 transition-opacity">
            DEFRAG
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/trust"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Trust
            </Link>
            <Link
              href="/about"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              About
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
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">Privacy by default.</h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          We store only what we need to provide continuity, exports, and auditability. You control
          memory and can request deletion at any time.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24 space-y-10 text-neutral-600 dark:text-neutral-400 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-3">What we store</h2>
          <ul className="space-y-2">
            <li>Account basics (email, created_at).</li>
            <li>Profiles and computed layers you create.</li>
            <li>Conversation turns and memory summaries (when memory is enabled).</li>
            <li>Tool audit metadata (timestamps, request IDs, status).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-3">What we do not store</h2>
          <ul className="space-y-2">
            <li>Passwords in plaintext.</li>
            <li>Secrets or internal system prompts.</li>
            <li>Provider model training data.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-3">Retention</h2>
          <p>
            By default, data is retained until you delete it or close your account. If retention
            windows are introduced later, they will be documented here.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-3">Exports</h2>
          <p>
            Exports are sanitized artifacts delivered via signed, time-limited URLs. They exclude
            sensitive fields and internal metadata.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-3">Your controls</h2>
          <ul className="space-y-2">
            <li>Disable memory at any time.</li>
            <li>Delete conversation history and stored memories.</li>
            <li>Request a full export or account deletion.</li>
          </ul>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

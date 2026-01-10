import Link from 'next/link';
import Hairline from "./Hairline";

export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-black">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Hairline className="mb-8" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="text-sm text-neutral-700 dark:text-neutral-300">DEFRAG</div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/trust">
              Trust
            </Link>
            <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/how-ai-works">
              How it works
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
          Structured self-reflection. Not predictive. Not diagnostic.
        </p>
      </div>
    </footer>
  );
}

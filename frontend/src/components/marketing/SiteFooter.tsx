import Link from 'next/link';
import Hairline from "./Hairline";

export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-black">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Hairline className="mb-8" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="text-sm font-medium tracking-[0.15em] text-neutral-700 dark:text-neutral-300">DEFRAG</div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-neutral-500 dark:text-neutral-400">
            <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/trust">
              Trust
            </Link>
            <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/how-ai-works">
              How it works
            </Link>
          </div>
        </div>

        <p className="mt-10 text-xs text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
          Structured self-reflection. Not predictive. Not diagnostic.
        </p>
        <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500">
          © {new Date().getFullYear()} Defrag. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

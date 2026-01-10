import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-wrap gap-6 text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/how-ai-works" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="/trust" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Trust
            </Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Terms
            </Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            © {new Date().getFullYear()} Defrag
          </p>
        </div>
        <p className="mt-8 text-xs text-neutral-400 dark:text-neutral-600 max-w-xl">
          Structured self-reflection. Not predictive. Not diagnostic. Not a substitute for professional care.
        </p>
      </div>
    </footer>
  );
}

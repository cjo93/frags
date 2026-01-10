import Link from 'next/link';
import Hairline from "./Hairline";

export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-neutral-950">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-sm font-medium tracking-[0.15em] text-neutral-900 dark:text-neutral-100 mb-4">DEFRAG</div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Personal integration through symbolic synthesis.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/how-ai-works">
                  How it works
                </Link>
              </li>
              <li>
                <Link className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/about">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">Trust</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/trust">
                  Security
                </Link>
              </li>
              <li>
                <Link className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/privacy">
                  Privacy
                </Link>
              </li>
              <li>
                <Link className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" href="/terms">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">Connect</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:hello@defrag.app" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="https://twitter.com/defragapp" target="_blank" rel="noopener noreferrer" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors inline-flex items-center gap-1.5">
                  Twitter
                  <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Hairline className="mb-8" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            © {new Date().getFullYear()} Defrag. All rights reserved.
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Not predictive. Not diagnostic. Not a substitute for professional care.
          </p>
        </div>
      </div>
    </footer>
  );
}

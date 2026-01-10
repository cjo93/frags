'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium tracking-tight">
          Defrag
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            href="/how-ai-works" 
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            How it works
          </Link>
          <Link 
            href="/pricing" 
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Pricing
          </Link>
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
          <Link
            href="/register"
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Initialize the Mirror
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-neutral-600 dark:text-neutral-400"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-4">
            <Link href="/how-ai-works" className="text-sm text-neutral-600 dark:text-neutral-400">How it works</Link>
            <Link href="/pricing" className="text-sm text-neutral-600 dark:text-neutral-400">Pricing</Link>
            <Link href="/trust" className="text-sm text-neutral-600 dark:text-neutral-400">Trust</Link>
            <Link href="/about" className="text-sm text-neutral-600 dark:text-neutral-400">About</Link>
            <Link href="/login" className="text-sm text-neutral-600 dark:text-neutral-400">Sign in</Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium"
            >
              Initialize the Mirror
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

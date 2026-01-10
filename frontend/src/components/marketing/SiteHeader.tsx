'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from "@/lib/cn";

export default function SiteHeader({ className }: { className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/60 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300",
        className
      )}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium tracking-[0.15em] text-neutral-900 dark:text-neutral-50 hover:opacity-70 transition-opacity">
          DEFRAG
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[13px] text-neutral-500 dark:text-neutral-400">
          <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/how-ai-works">
            How it works
          </Link>
          <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/trust">
            Trust
          </Link>
          <Link className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200" href="/about">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-[13px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13px] font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Initialize the Mirror
          </Link>
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
        </div>
      </div>

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

'use client';

import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-light tracking-tight mb-4">
          Checkout cancelled
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          No charges were made. You can return to pricing when you&apos;re ready.
        </p>
        <Link
          href="/pricing"
          className="inline-flex px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          View pricing
        </Link>
      </div>
    </main>
  );
}

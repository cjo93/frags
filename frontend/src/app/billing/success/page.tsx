'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after a brief moment
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-light tracking-tight mb-4">
          Subscription confirmed
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Your access has been upgraded. Redirecting to your dashboard...
        </p>
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white rounded-full animate-spin mx-auto" />
      </div>
    </main>
  );
}

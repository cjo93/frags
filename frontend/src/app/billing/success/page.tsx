'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { billing, refresh } = useAuth();
  const [status, setStatus] = useState<'polling' | 'ready' | 'timeout'>('polling');
  const sessionId = searchParams.get('session_id');

  const pollForUpgrade = useCallback(async (attempt: number) => {
    const maxAttempts = 10; // 10 attempts * 2s = 20s max wait

    try {
      // Refresh user data to check if subscription updated
      await refresh();
    } catch (e) {
      console.warn('Poll attempt failed:', e);
    }

    // After refresh, check tier in next render cycle
    if (attempt >= maxAttempts) {
      setStatus('timeout');
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  }, [refresh, router]);

  useEffect(() => {
    if (!sessionId) {
      // No session ID, just redirect
      router.push('/dashboard');
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const doPoll = async () => {
      if (cancelled) return;
      attempts++;
      await pollForUpgrade(attempts);
      
      if (!cancelled && attempts < 10) {
        setTimeout(doPoll, 2000);
      }
    };

    // Start polling after a brief delay (give webhook time to fire)
    const initialDelay = setTimeout(doPoll, 1500);

    return () => {
      cancelled = true;
      clearTimeout(initialDelay);
    };
  }, [sessionId, router, pollForUpgrade]);

  // Watch for plan_key change (subscription upgrade)
  useEffect(() => {
    if (billing?.plan_key && billing.plan_key !== 'free') {
      setStatus('ready');
      setTimeout(() => router.push('/dashboard'), 1500);
    }
  }, [billing?.plan_key, router]);

  return (
    <div className="text-center max-w-md">
      <div className="text-4xl mb-6">✓</div>
      <h1 className="text-2xl font-light tracking-tight mb-4">
        {status === 'ready' ? 'Subscription confirmed!' : 'Processing your subscription...'}
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        {status === 'polling' && 'Confirming your upgrade...'}
        {status === 'ready' && 'Your access has been upgraded. Redirecting to your dashboard...'}
        {status === 'timeout' && 'Taking longer than expected. Redirecting to dashboard...'}
      </p>
      <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white rounded-full animate-spin mx-auto" />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center max-w-md">
      <div className="text-4xl mb-6">✓</div>
      <h1 className="text-2xl font-light tracking-tight mb-4">
        Processing your subscription...
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Loading...
      </p>
      <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white rounded-full animate-spin mx-auto" />
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={<LoadingFallback />}>
        <BillingSuccessContent />
      </Suspense>
    </main>
  );
}

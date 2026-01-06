'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createPortal } from '@/lib/api';
import { resetInstallPrompt } from '@/components/pwa';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, billing, refresh, logout } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    refresh();
  }, [token, router, refresh]);

  if (!token) {
    return null;
  }

  const currentPlan = billing?.plan_key || 'free';
  const planName = billing?.plan_name || 'Free';
  const subscription = billing?.subscription;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const willCancel = subscription?.cancel_at_period_end || false;

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortal();
      router.push(url);
    } catch (err) {
      console.error('Portal error:', err);
      setPortalLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <h1 className="text-2xl font-light tracking-tight mb-8">Settings</h1>

        {/* Account */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Account</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Email</p>
              <p className="text-neutral-900 dark:text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Member since</p>
              <p className="text-neutral-900 dark:text-white">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Plan & Billing */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Plan & Billing</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Current plan</p>
                <p className="text-xl font-light text-neutral-900 dark:text-white">{planName}</p>
              </div>
              {currentPlan !== 'free' && (
                <span className="px-3 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  Active
                </span>
              )}
            </div>

            {renewalDate && (
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                  {willCancel ? 'Access until' : 'Renews on'}
                </p>
                <p className="text-neutral-900 dark:text-white">{renewalDate}</p>
                {willCancel && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Your subscription will not renew.
                  </p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-4">
              {currentPlan === 'free' ? (
                <Link
                  href="/pricing"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
                >
                  View plans
                </Link>
              ) : (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-50"
                >
                  {portalLoading ? 'Loading...' : 'Manage billing'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Data & Privacy */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Data & Privacy</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Deterministic synthesis.</strong>{' '}
                Chart calculations use established algorithms—same inputs always produce same outputs.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">AI is interpretation only.</strong>{' '}
                AI explains computed data; it doesn&apos;t generate placements or make predictions.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Your data stays yours.</strong>{' '}
                No cross-user data sharing. AI providers don&apos;t store or train on your data.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Not medical or financial advice.</strong>{' '}
                Defrag is a tool for self-reflection, not a substitute for professional guidance.
              </p>
            </div>
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                href="/how-ai-works"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
              >
                Learn how AI works in Defrag →
              </Link>
            </div>
          </div>
        </section>

        {/* App */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">App</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Install on your device</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                Add Defrag to your home screen for a faster, full-screen experience.
              </p>
              <button
                onClick={() => {
                  resetInstallPrompt();
                  // Reload to trigger the prompt
                  window.location.reload();
                }}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
              >
                Show install instructions
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

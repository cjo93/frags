'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { grantBetaAccess, revokeBetaAccess } from '@/lib/api';
import { exportNatalSafeJson } from '@/lib/agentClient';
import { useAgentSettings } from '@/lib/agent-settings';
import { resetInstallPrompt } from '@/components/pwa';
import { isStandalone, isIOS } from '@/lib/displayMode';
import TrustStrip from '@/components/TrustStrip';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, billing, profiles, refresh, logout } = useAuth();
  const { enabled, memoryEnabled, selectedProfileId, setEnabled, setMemoryEnabled } = useAgentSettings();
  const [exportLoading, setExportLoading] = useState(false);
  const [betaEmail, setBetaEmail] = useState('');
  const [betaPlan, setBetaPlan] = useState<'beta' | 'pro'>('beta');
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaMessage, setBetaMessage] = useState('');
  
  // Initialize on client only using lazy initializer
  const [installed] = useState(() => {
    if (typeof window === "undefined") return false;
    return isStandalone();
  });
  const [isiOSDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return isIOS();
  });

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

  const isDevAdmin = user?.email === 'chadowen93@gmail.com';

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

  const handleExportSafeJson = async () => {
    setExportLoading(true);
    try {
      const profileId = selectedProfileId || (profiles.length === 1 ? profiles[0].id : undefined);
      const res = await exportNatalSafeJson(profileId);
      window.open(res.artifact.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleGrantBeta = async () => {
    const email = betaEmail.trim().toLowerCase();
    if (!email) return;
    setBetaLoading(true);
    setBetaMessage('');
    try {
      await grantBetaAccess(email, betaPlan);
      setBetaMessage('Beta access granted.');
    } catch {
      setBetaMessage('Failed to grant beta access.');
    } finally {
      setBetaLoading(false);
    }
  };

  const handleRevokeBeta = async () => {
    const email = betaEmail.trim().toLowerCase();
    if (!email) return;
    setBetaLoading(true);
    setBetaMessage('');
    try {
      await revokeBetaAccess(email);
      setBetaMessage('Beta access revoked.');
    } catch {
      setBetaMessage('Failed to revoke beta access.');
    } finally {
      setBetaLoading(false);
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
        <TrustStrip className="mb-10" />

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

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              {currentPlan === 'free' ? (
                <Link
                  href="/pricing"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
                >
                  View plans
                </Link>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Billing updates are handled through your receipt emails.
                </p>
              )}
            </div>
          </div>
        </section>

        {isDevAdmin && (
          <section className="mb-12">
            <h2 className="text-lg font-medium mb-4">Beta Access</h2>
            <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Grant full-tier access without admin permissions. Changes apply immediately.
              </p>
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Tester email
                  <input
                    type="email"
                    value={betaEmail}
                    onChange={(e) => setBetaEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-2 w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Plan
                  <select
                    value={betaPlan}
                    onChange={(e) => setBetaPlan(e.target.value as 'beta' | 'pro')}
                    className="mt-2 w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                  >
                    <option value="beta">Beta (full access)</option>
                    <option value="pro">Pro (integration)</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGrantBeta}
                  disabled={betaLoading}
                  className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                >
                  Grant access
                </button>
                <button
                  onClick={handleRevokeBeta}
                  disabled={betaLoading}
                  className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                >
                  Revoke access
                </button>
              </div>
              {betaMessage && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{betaMessage}</p>
              )}
            </div>
          </section>
        )}

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

        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Privacy & Security</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Encrypted in transit (TLS).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Export links expire automatically.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Memory is optional and can be disabled anytime.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Request deletion of your history at any time.</span>
            </div>
          </div>
        </section>

        {/* AI Settings */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">AI Settings</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-6">
            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-900 dark:text-white">AgentDock</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Show the global assistant dock.</p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5 accent-neutral-900"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-900 dark:text-white">Memory</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">On: remembers preferences and context. Off: session-only.</p>
              </div>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(e) => setMemoryEnabled(e.target.checked)}
                className="h-5 w-5 accent-neutral-900"
              />
            </label>
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={handleExportSafeJson}
                disabled={exportLoading}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-50"
              >
                {exportLoading ? 'Exporting...' : 'Export safe JSON'}
              </button>
            </div>
          </div>
        </section>

        {/* App */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">App</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
            {/* Install Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Status</p>
                <p className="text-neutral-900 dark:text-white">
                  {installed ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      Installed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 bg-neutral-400 rounded-full" />
                      Browser mode
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Install Instructions (only show if not installed) */}
            {!installed && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Install on your device</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  Add Defrag to your home screen for a faster, full-screen experience.
                </p>
                
                {isiOSDevice ? (
                  <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 mb-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Tap <span className="font-medium text-neutral-900 dark:text-white">Share</span> → <span className="font-medium text-neutral-900 dark:text-white">Add to Home Screen</span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 mb-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Look for the install icon in your browser&apos;s address bar or menu.
                    </p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    resetInstallPrompt();
                    window.location.reload();
                  }}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
                >
                  Show install prompt
                </button>
              </div>
            )}

            {/* Benefits when installed */}
            {installed && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  You&apos;re using Defrag as an installed app. Enjoy the full-screen experience!
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

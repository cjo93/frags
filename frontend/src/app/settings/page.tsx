'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { exportNatalSafeJson } from '@/lib/agentClient';
import { useAgentSettings } from '@/lib/agent-settings';
import { resetInstallPrompt } from '@/components/pwa';
import { isStandalone, isIOS } from '@/lib/displayMode';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, billing, refresh, logout } = useAuth();
  const { enabled, memoryEnabled, setEnabled, setMemoryEnabled } = useAgentSettings();
  const [exportLoading, setExportLoading] = useState(false);
  
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
      const res = await exportNatalSafeJson();
      window.open(res.artifact.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-[0.15em] text-neutral-900 dark:text-neutral-50 hover:opacity-70 transition-opacity">
            DEFRAG
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
                <></>
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
                <strong className="text-neutral-900 dark:text-white">1) Create your profile.</strong>{' '}
                We compute your baseline from birth time + location (astronomical positions + geometry). Same inputs → same result.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">2) Get your Daily Reading + Reset.</strong>{' '}
                A clear theme, the pressure windows to watch, and a 90‑second Micro‑Defrag grounded in CBT / IFS principles.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">3‑day curriculum (free).</strong>{' '}
                Your first three days guide you through your current timing theme using your natal makeup—so you can apply the guidance, not just read it.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Timing is treated like weather.</strong>{' '}
                We describe cycles and intensity to help you pace decisions and recovery. We do not promise specific events or outcomes.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Grounded by real signals.</strong>{' '}
                If you connect wearable/health data, Defrag can correlate timing with sleep, recovery, HRV, and stress—so your guidance stays tethered to your physiology.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">AI is for exploration.</strong>{' '}
                Use the assistant to unpack the reading, ask for examples, generate an audio overview, or export safely—without fabricating data.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Privacy by default.</strong>{' '}
                No cross‑user sharing. Your content is not used to train models. Memory is opt‑in and you can clear it anytime.
              </p>
            </div>
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                href="/how-ai-works"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
              >
                How the assistant works →
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Privacy & Security</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Encrypted in transit (TLS) and scoped access tokens.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Expiring export links with signed URLs.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>Optional memory, per-user isolation, and request IDs for auditability.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-400">•</span>
              <span>You can request deletion of your data and history.</span>
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
                <p className="text-xs text-neutral-500 dark:text-neutral-400">On: remembers your preferences and selected profile across sessions. Off: session-only context.</p>
              </div>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(e) => setMemoryEnabled(e.target.checked)}
                className="h-5 w-5 accent-neutral-900"
              />
            </label>
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <div className="space-y-2">
                <button
                  disabled
                  className="text-sm text-neutral-400 underline underline-offset-4 cursor-not-allowed"
                  title="Coming soon"
                >
                  Add your Mandala Card to Apple Wallet (soon)
                </button>
                <button
                  onClick={handleExportSafeJson}
                  disabled={exportLoading}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-50"
                >
                  {exportLoading ? 'Preparing export…' : 'Download a secure data package (advanced)'}
                </button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  This creates a signed, redacted data package for portability and troubleshooting (advanced users). It is not a raw JSON dump. Longer‑term, your portable “default” will be your Mandala Card in Apple Wallet.
                </p>
              </div>
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

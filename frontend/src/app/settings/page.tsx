'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createBetaInvite, grantBetaAccess, listBetaInvites, revokeBetaAccess } from '@/lib/api';
import { exportNatalSafeJson } from '@/lib/agentClient';
import { useAgentSettings } from '@/lib/agent-settings';
import { resetInstallPrompt } from '@/components/pwa';
import { isStandalone, isIOS } from '@/lib/displayMode';
import TrustStrip from '@/components/TrustStrip';
import { downloadPkpass, WalletError } from '@/lib/wallet';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, billing, profiles, refresh, logout } = useAuth();
  const { enabled, memoryEnabled, selectedProfileId, setEnabled, setMemoryEnabled } = useAgentSettings();
  const [exportLoading, setExportLoading] = useState(false);
  const [betaEmail, setBetaEmail] = useState('');
  const [betaPlan, setBetaPlan] = useState<'beta' | 'pro'>('beta');
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaMessage, setBetaMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTtlHours, setInviteTtlHours] = useState(168);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [invites, setInvites] = useState<Array<{ email: string; created_at: string | null; expires_at: string | null; accepted_at: string | null }>>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<{ message: string; requestId?: string } | null>(null);
  const [walletSuccess, setWalletSuccess] = useState(false);
  
  // Initialize on client only using lazy initializer
  const [installed] = useState(() => {
    if (typeof window === "undefined") return false;
    return isStandalone();
  });
  const [isiOSDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return isIOS();
  });

  const isDevAdmin = user?.email === 'chadowen93@gmail.com';
  const refreshInvites = useCallback(async () => {
    if (!isDevAdmin) return;
    try {
      const res = await listBetaInvites();
      setInvites(res.invites);
    } catch {
      setInvites([]);
    }
  }, [isDevAdmin]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    refresh();
  }, [token, router, refresh]);

  useEffect(() => {
    if (!isDevAdmin) return;
    refreshInvites();
  }, [isDevAdmin, refreshInvites]);

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
  const accessStatus = currentPlan === 'beta' ? 'Beta access enabled' : 'Standard access';

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

  const handleWalletPass = async () => {
    if (walletLoading) return;
    setWalletError(null);
    setWalletSuccess(false);
    if (!token) {
      setWalletError({ message: 'Sign in to add your Mandala Card.' });
      return;
    }
    if (profiles.length === 0) {
      setWalletError({ message: 'Create your profile to unlock your Mandala Card.' });
      return;
    }
    if (!selectedProfileId && profiles.length > 1) {
      setWalletError({ message: 'Select a profile to continue.' });
      return;
    }
    const profileId = selectedProfileId || (profiles.length === 1 ? profiles[0].id : undefined);
    setWalletLoading(true);
    try {
      await downloadPkpass(profileId);
      setWalletSuccess(true);
      setTimeout(() => setWalletSuccess(false), 5000);
    } catch (err) {
      if (err instanceof WalletError) {
        setWalletError({ message: err.message, requestId: err.requestId });
      } else {
        setWalletError({ message: 'Could not prepare Wallet pass. Try again.' });
      }
    } finally {
      setWalletLoading(false);
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

  const handleCreateInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteLoading(true);
    setInviteError('');
    setInviteToken('');
    setInviteExpiresAt(null);
    try {
      const res = await createBetaInvite(email, inviteTtlHours);
      setInviteToken(res.invite_token);
      setInviteExpiresAt(res.expires_at);
      setInviteEmail('');
      await refreshInvites();
    } catch {
      setInviteError('Failed to create invite.');
    } finally {
      setInviteLoading(false);
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
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Access</p>
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {accessStatus}
              </span>
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
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Create invite links for beta access. Tokens are single-use and expire automatically.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Invite email
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="mt-2 w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    TTL (hours)
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={inviteTtlHours}
                      onChange={(e) => setInviteTtlHours(Number(e.target.value) || 168)}
                      className="mt-2 w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCreateInvite}
                    disabled={inviteLoading}
                    className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Create invite
                  </button>
                  <button
                    onClick={refreshInvites}
                    disabled={inviteLoading}
                    className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                )}
                {inviteToken && (
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
                    <div className="font-medium text-neutral-900 dark:text-white">Invite token</div>
                    <div className="break-all">{inviteToken}</div>
                    {inviteExpiresAt && <div>Expires: {new Date(inviteExpiresAt).toLocaleString()}</div>}
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(inviteToken)}
                      className="text-xs underline underline-offset-4"
                    >
                      Copy token
                    </button>
                  </div>
                )}
                {invites.length > 0 && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-2">
                    <div className="font-medium text-neutral-700 dark:text-neutral-300">Recent invites</div>
                    <div className="space-y-2">
                      {invites.map((invite) => (
                        <div key={`${invite.email}-${invite.created_at || ''}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-neutral-200 dark:border-neutral-800 rounded-md p-2">
                          <div>
                            <div className="text-neutral-700 dark:text-neutral-300">{invite.email}</div>
                            <div>
                              {invite.accepted_at
                                ? `Accepted: ${new Date(invite.accepted_at).toLocaleDateString()}`
                                : invite.expires_at
                                  ? `Expires: ${new Date(invite.expires_at).toLocaleDateString()}`
                                  : 'No expiry'}
                            </div>
                          </div>
                          <span className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            {invite.accepted_at ? 'Accepted' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Data & Privacy */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Data & Privacy</h2>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Your blueprint is computed.</strong>{' '}
                We compute your baseline structure from birth time + location using deterministic astronomy + geometry. Same inputs → same results.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Your daily reading is a curriculum.</strong>{' '}
                Each day you get a short report and a focused 3-day theme (based on your current timing + natal makeup) that guides practical choices.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Timing is treated like weather.</strong>{' '}
                We describe pressure windows and themes you can plan around. It&apos;s not a promise of events — it&apos;s a map for self-regulation.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Physiology is optional.</strong>{' '}
                If you connect wearable/health data, Defrag can correlate your timing with signals like sleep, recovery, HRV, and stress. You control what&apos;s connected and can disconnect anytime.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">AI helps you explore.</strong>{' '}
                The assistant explains what was computed, helps you apply it, and can generate audio/visual summaries. It does not invent placements or fabricate claims.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <strong className="text-neutral-900 dark:text-white">Privacy by default.</strong>{' '}
                No cross-user sharing. Your content is not used to train models. Memory is opt-in and reversible.
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
                {exportLoading ? 'Exporting...' : 'Download a redacted export (advanced data)'}
              </button>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Your Wallet card will be the default destination for your computed mandala and key fields. The redacted export is for troubleshooting and data portability (advanced users).
              </p>
            </div>
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <button
                onClick={handleWalletPass}
                disabled={walletLoading}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-50"
              >
                {walletLoading
                  ? 'Preparing Wallet pass...'
                  : isiOSDevice
                    ? 'Add Mandala Card to Apple Wallet'
                    : 'Download Wallet pass'}
              </button>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Stores your Mandala and a secure link to your portable data package.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Share via iMessage or AirDrop. Recipients can view today&apos;s reading only.
              </p>
              {walletSuccess && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Added to Wallet. You can share it from the Wallet app.
                </div>
              )}
              {walletError && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  {walletError.message}
                  {walletError.requestId ? ` (Request ID: ${walletError.requestId})` : ''}
                </div>
              )}
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

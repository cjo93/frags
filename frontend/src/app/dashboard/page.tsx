'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createPortal } from '@/lib/api';
import type { FeatureFlags } from '@/lib/api';
import { OnboardingPanel, useOnboardingState } from '@/components/onboarding';
import Mandala from '@/components/Mandala';
import { ANCHORS } from '@/content/marketingCopy';

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, billing, profiles, constellations, refresh, logout } = useAuth();
  const { hasSeen: hasSeenOnboarding, markSeen: markOnboardingSeen } = useOnboardingState();

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

  const featureFlags: Partial<FeatureFlags> = billing?.feature_flags || {};
  const currentPlan = billing?.plan_key || 'free';
  const isActive = billing?.entitled || false;

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium tracking-[0.15em] text-neutral-900 dark:text-neutral-50 hover:opacity-70 transition-opacity">
            DEFRAG
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/settings"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Settings
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

      {/* Main content */}
      <section className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="fade-up flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-light tracking-tight">
                {user?.email ? 'Enter the Field' : 'Enter the Field'}
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {currentPlan !== 'free' && isActive
                  ? `Capacity: ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}`
                  : 'Capacity: Free'}
              </p>
            </div>
            <Mandala state="CLEAR" />
          </div>

          {/* Onboarding panel */}
          {!hasSeenOnboarding && (
            <OnboardingPanel onDismiss={markOnboardingSeen} />
          )}

          {/* Profiles section */}
          <section className="fade-up fade-up-2 mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Profiles</h2>
              <Link
                href="/profile/new"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                + New profile
              </Link>
            </div>
            {profiles && profiles.length > 0 ? (
              <div className="grid gap-4">
                {profiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.id}`}
                    className="hover-lift group p-5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-950 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200"
                  >
                    <h3 className="font-medium group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{profile.name || 'Unnamed profile'}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Created {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mb-1">No profiles yet</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4">Create a profile to begin your daily read</p>
                <Link
                  href="/profile/new"
                  className="hover-lift inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create profile
                </Link>
              </div>
            )}
          </section>

          {/* Constellations section */}
          {(featureFlags.constellation_create || featureFlags.constellation_compute) && (
            <section className="fade-up fade-up-3 mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Constellations</h2>
                {featureFlags.constellation_create && (
                  <button
                    onClick={async () => {
                      const portal = await createPortal();
                      if (portal?.url) {
                        window.location.href = portal.url;
                      }
                    }}
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    + New constellation
                  </button>
                )}
              </div>
              {constellations && constellations.length > 0 ? (
                <div className="grid gap-4">
                  {constellations.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/constellation/${c.id}`}
                      className="hover-lift group p-5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-950 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200"
                    >
                      <h3 className="font-medium group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{c.name || 'Unnamed constellation'}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Created {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'recently'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                    <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-1">No constellations yet</p>
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4">See relational geometry between profiles</p>
                  {featureFlags.constellation_create && (
                    <button
                      onClick={async () => {
                        const portal = await createPortal();
                        if (portal?.url) {
                          window.location.href = portal.url;
                        }
                      }}
                      className="hover-lift inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Create constellation
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* AI Preview section */}
          {(featureFlags.ai_preview_allowed || featureFlags.ai_full_allowed) && (
            <section className="fade-up fade-up-4 mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Ask</h2>
              </div>
              <div className="hover-lift p-6 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white dark:text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Ask</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      Ask grounded questions about your profile. Receive structured reflection.
                    </p>
                    <Link
                      href={profiles && profiles.length > 0 ? `/profile/${profiles[0].id}/ask` : "/profile/new"}
                      className="hover-lift inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium transition-all duration-200"
                    >
                      Enter Ask
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-xs text-neutral-400">
            {ANCHORS.trustLine}
          </p>
        </div>
      </footer>
    </main>
  );
}

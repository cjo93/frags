'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createPortal } from '@/lib/api';
import type { FeatureFlags } from '@/lib/api';
import { OnboardingPanel, useOnboardingState } from '@/components/onboarding';
import Mandala from '@/components/Mandala';

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
              href="/dashboard/settings"
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-light tracking-tight">
                {user?.email ? `Welcome back` : 'Dashboard'}
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {currentPlan !== 'free' && isActive
                  ? `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan active`
                  : 'Free tier'}
              </p>
            </div>
            <Mandala state="CLEAR" />
          </div>

          {/* Onboarding panel */}
          {!hasSeenOnboarding && (
            <OnboardingPanel onDismiss={markOnboardingSeen} />
          )}

          {/* Profiles section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Profiles</h2>
              <Link
                href="/dashboard/profiles/new"
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
                    href={`/dashboard/profiles/${profile.id}`}
                    className="p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                  >
                    <h3 className="font-medium">{profile.name || 'Unnamed profile'}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Created {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">No profiles yet</p>
                <Link
                  href="/dashboard/profiles/new"
                  className="inline-block mt-4 text-sm font-medium hover:underline"
                >
                  Create your first profile
                </Link>
              </div>
            )}
          </section>

          {/* Constellations section */}
          {(featureFlags.constellation_create || featureFlags.constellation_compute) && (
            <section className="mb-12">
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
                      className="p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <h3 className="font-medium">{c.name || 'Unnamed constellation'}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Created {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'recently'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                  <p className="text-neutral-500 dark:text-neutral-400">No constellations yet</p>
                  {featureFlags.constellation_create && (
                    <button
                      onClick={async () => {
                        const portal = await createPortal();
                        if (portal?.url) {
                          window.location.href = portal.url;
                        }
                      }}
                      className="inline-block mt-4 text-sm font-medium hover:underline"
                    >
                      Create your first constellation
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* AI Preview section */}
          {(featureFlags.ai_preview_allowed || featureFlags.ai_full_allowed) && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">AI Exploration</h2>
              </div>
              <div className="p-4 border border-neutral-200 dark:border-neutral-800">
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Use AI to explore and understand your computed patterns.
                </p>
                <Link
                  href="/dashboard/ai"
                  className="inline-flex items-center justify-center px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Open AI Chat
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-xs text-neutral-400">
            Defrag is a tool for self-reflection. Not medical or therapeutic advice.
          </p>
        </div>
      </footer>
    </main>
  );
}

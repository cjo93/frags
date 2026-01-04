'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createPortal } from '@/lib/api';
import type { FeatureFlags } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, billing, profiles, constellations, refresh, logout } = useAuth();

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
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        {/* Current Access */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-medium">Current Access</h2>
            {currentPlan === 'free' && (
              <Link
                href="/pricing"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
              >
                View plans
              </Link>
            )}
          </div>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Plan
                </p>
                <p className="text-xl font-light capitalize">
                  {currentPlan === 'free' ? 'Free' : currentPlan}
                </p>
              </div>
              {isActive && currentPlan !== 'free' && (
                <span className="px-3 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  Active
                </span>
              )}
            </div>
            {featureFlags.ai_preview_allowed && !featureFlags.ai_full_allowed && (
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                You have access to AI synthesis previews.{' '}
                <Link href="/pricing" className="underline underline-offset-4">
                  Unlock full synthesis
                </Link>
              </p>
            )}
            {featureFlags.ai_full_allowed && (
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                Full AI synthesis access enabled.
              </p>
            )}
            {currentPlan !== 'free' && (
              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <ManageBillingButton />
              </div>
            )}
          </div>
        </section>

        {/* Your Profiles */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-medium">Your Profiles</h2>
            <span className="text-sm text-neutral-400">
              {profiles?.length || 0} {(profiles?.length || 0) === 1 ? 'profile' : 'profiles'}
            </span>
          </div>

          {(!profiles || profiles.length === 0) ? (
            <div className="p-8 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                No profiles yet.
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-600">
                A profile contains your birth data and computed synthesis across 
                Human Design, Gene Keys, numerology, and astrology.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} featureFlags={featureFlags} />
              ))}
            </div>
          )}
        </section>

        {/* Your Systems */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Your Systems</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SystemCard
              title="Human Design"
              description="Your energetic blueprint and decision-making strategy"
              available={true}
            />
            <SystemCard
              title="Gene Keys"
              description="Your hologenetic profile and life's purpose"
              available={true}
            />
            <SystemCard
              title="Numerology"
              description="Your core numbers and life path"
              available={true}
            />
            <SystemCard
              title="Astrology"
              description="Your natal chart and planetary influences"
              available={true}
            />
          </div>
        </section>

        {/* Constellations */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-medium">Your Constellations</h2>
            {featureFlags.constellation_create && (
              <span className="text-sm text-neutral-400">
                {constellations?.length || 0} {(constellations?.length || 0) === 1 ? 'constellation' : 'constellations'}
              </span>
            )}
          </div>

          {!featureFlags.constellation_create ? (
            <div className="p-8 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
              <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                Constellations require the Constellation plan.
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mb-4">
                Map family patterns and relational dynamics across multiple profiles.
              </p>
              <Link
                href="/pricing"
                className="text-sm underline underline-offset-4 text-neutral-600 dark:text-neutral-400"
              >
                Learn more
              </Link>
            </div>
          ) : (!constellations || constellations.length === 0) ? (
            <div className="p-8 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Constellations reveal patterns that only emerge between people.
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-600">
                Create one when you&apos;re ready to explore relationships, not just traits.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {constellations.map((constellation) => (
                <ConstellationCard key={constellation.id} constellation={constellation} />
              ))}
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <section className="pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed max-w-2xl">
            Defrag synthesizes symbolic systems for self-exploration. It is not 
            predictive, diagnostic, or a replacement for professional guidance. 
            Your data is stored securely and never shared with third parties.
          </p>
        </section>
      </div>
    </main>
  );
}

function ProfileCard({ 
  profile, 
  featureFlags 
}: { 
  profile: { id: string; name: string; birth_date?: string }; 
  featureFlags: Partial<FeatureFlags>;
}) {
  return (
    <div className="p-6 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
      <div>
        <p className="font-medium">{profile.name}</p>
        {profile.birth_date && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {new Date(profile.birth_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {(featureFlags.ai_preview_allowed || featureFlags.ai_full_allowed) && (
          <Link
            href={`/profile/${profile.id}/ask`}
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
          >
            Ask about this
          </Link>
        )}
        <Link
          href={`/profile/${profile.id}`}
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

function SystemCard({
  title,
  description,
  available,
}: {
  title: string;
  description: string;
  available: boolean;
}) {
  return (
    <div className="p-4 border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-sm">{title}</p>
        {available && (
          <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-600 rounded-full" />
        )}
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function ConstellationCard({
  constellation,
}: {
  constellation: { id: string; name: string; profile_count?: number };
}) {
  return (
    <div className="p-6 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
      <div>
        <p className="font-medium">{constellation.name}</p>
        {constellation.profile_count && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {constellation.profile_count} profiles
          </p>
        )}
      </div>
      <Link
        href={`/constellation/${constellation.id}`}
        className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
      >
        View →
      </Link>
    </div>
  );
}
function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const { url } = await createPortal();
      router.push(url);
    } catch (err) {
      console.error('Portal error:', err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManageBilling}
      disabled={loading}
      className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Manage billing'}
    </button>
  );
}
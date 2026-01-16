'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profiles, isLoading } = useAuth();
  const profileId = params.id as string;

  const profileName = profiles?.find((x) => x.id === profileId)?.name;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {profileName || 'Profile'}
          </h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Header Section */}
          <div>
            <h2 className="text-2xl font-light text-neutral-900 dark:text-white">
              {profileName || 'Loading...'}
            </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Explore your profile through structured reflection.
            </p>
          </div>

          {/* Actions Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Ask / Chat */}
            <Link
              href={`/profile/${profileId}/ask`}
              className="group relative p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 hover:-translate-y-1 bg-white dark:bg-neutral-900"
            >
              <div className="absolute top-6 right-6 text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">Ask</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Dialog with your profile. Unpack transits, patterns, and themes.
              </p>
            </Link>

            {/* Placeholder for future features */}
            <div className="p-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
               <div className="mb-2 text-neutral-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
               </div>
               <h3 className="text-lg font-medium text-neutral-500 dark:text-neutral-500 mb-2">Reports (Coming Soon)</h3>
               <p className="text-sm text-neutral-400 dark:text-neutral-600">
                 Detailed breakdown of your chart and current transits.
               </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProfileFromText, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function NewProfilePage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [natalText, setNatalText] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { profile_id } = await createProfileFromText(name, natalText, timezone);
      await refresh(); // Update the profile list in context
      router.push(`/profile/${profile_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-sm font-medium text-neutral-900 dark:text-white">
            Create Profile
          </h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-light tracking-tight text-neutral-900 dark:text-white mb-2">
              New Profile
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter birth details as text (e.g., &quot;Jan 1, 1980 12:00 PM New York, NY&quot;).
              The engine will parse this to generate the natal chart.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="My Profile"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="natalText" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Birth Details
              </label>
              <textarea
                id="natalText"
                value={natalText}
                onChange={(e) => setNatalText(e.target.value)}
                required
                placeholder="e.g. June 15, 1990 at 3:30 PM in Los Angeles, CA"
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all resize-none"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Format: Date, Time, and Location. Precise time is important for accurate houses.
              </p>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Viewing Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
              >
                {Intl.supportedValuesOf('timeZone').map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

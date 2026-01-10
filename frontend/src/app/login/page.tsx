'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import LegalFooter from '@/components/LegalFooter';

export default function LoginPage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-sm text-center space-y-3">
            <h1 className="text-xl font-medium">Sign in</h1>
            <p className="text-sm text-neutral-600">Loading…</p>
          </div>
        </main>
      )}
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token } = await apiLogin(email, password);
      login(token);
      router.push('/dashboard');
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
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="text-sm font-medium tracking-[0.15em] text-neutral-900 dark:text-neutral-50 hover:opacity-70 transition-opacity">
            DEFRAG
          </Link>
        </nav>
      </header>

      {/* Form */}
      <section className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-light tracking-tight mb-2">
            Sign in
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
            Access your profiles. Deterministic compute with optional memory.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-base focus:border-neutral-900 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-base focus:border-neutral-900 dark:focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-neutral-900 dark:text-white underline underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

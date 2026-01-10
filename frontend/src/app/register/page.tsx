'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { register as apiRegister, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Turnstile, isTurnstileEnabled, getTurnstileSiteKey } from '@/components/Turnstile';
import TrustStrip from '@/components/TrustStrip';
import LegalFooter from '@/components/LegalFooter';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-sm text-center space-y-3">
            <h1 className="text-xl font-medium">Create an account</h1>
            <p className="text-sm text-neutral-600">Loading…</p>
          </div>
        </main>
      )}
    >
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Only require Turnstile if enabled AND the widget loaded successfully
    if (isTurnstileEnabled() && turnstileReady && !turnstileToken) {
      setError('Please complete the verification');
      return;
    }

    setLoading(true);

    try {
      const { token } = await apiRegister(
        email,
        password,
        turnstileToken || undefined,
        inviteToken || undefined
      );
      login(token);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        // Reset turnstile token on error so user can retry
        setTurnstileToken(null);
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
            Create an account
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
            Deterministic compute with optional memory. No predictions, no diagnoses.
          </p>

          <TrustStrip className="mb-6" />

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
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-base focus:border-neutral-900 dark:focus:border-white transition-colors"
              />
              <p className="mt-1 text-xs text-neutral-400">Minimum 8 characters</p>
            </div>

            {/* Turnstile CAPTCHA */}
            {isTurnstileEnabled() && (
              <Turnstile
                siteKey={getTurnstileSiteKey()}
                onVerify={(token) => {
                  setTurnstileReady(true);
                  setTurnstileToken(token);
                }}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileReady(false)}
                className="flex justify-center"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
            Already have an account?{' '}
            <Link href="/login" className="text-neutral-900 dark:text-white underline underline-offset-4">
              Sign in
            </Link>
          </p>

          {/* Disclaimer */}
          <p className="mt-8 text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed">
            By creating an account, you acknowledge Defrag is a tool for self-reflection and
            structured exploration, not a substitute for professional mental health care.
          </p>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

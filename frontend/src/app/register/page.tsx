'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register as apiRegister, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Turnstile, isTurnstileEnabled, getTurnstileSiteKey } from '@/components/Turnstile';
import TrustStrip from '@/components/TrustStrip';
import LegalFooter from '@/components/LegalFooter';

const OAUTH_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check Turnstile if enabled
    if (isTurnstileEnabled() && !turnstileToken) {
      setError('Please complete the verification');
      return;
    }
    
    setLoading(true);

    try {
      const { token } = await apiRegister(email, password, turnstileToken || undefined);
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
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
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

          <div className="space-y-2 mb-6">
            <a
              href={`${OAUTH_BASE}/auth/oauth/google/start`}
              className="w-full inline-flex items-center justify-center py-3 border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:border-neutral-900 dark:hover:border-white transition-colors"
            >
              Continue with Google
            </a>
            <a
              href={`${OAUTH_BASE}/auth/oauth/apple/start`}
              className="w-full inline-flex items-center justify-center py-3 border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:border-neutral-900 dark:hover:border-white transition-colors"
            >
              Continue with Apple
            </a>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Google/Apple sign-in is in beta.
            </p>
          </div>
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
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                className="flex justify-center"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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

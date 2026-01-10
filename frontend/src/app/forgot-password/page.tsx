'use client';

import Link from 'next/link';
import { useState } from 'react';
import LegalFooter from '@/components/LegalFooter';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';

class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.detail || 'Failed to send reset code');
      }

      setStep('code');
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.detail || 'Failed to reset password');
      }

      setStep('success');
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
          {step === 'email' && (
            <>
              <h1 className="text-2xl font-light tracking-tight mb-2">
                Reset password
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                Enter your email and we&apos;ll send you a reset code.
              </p>

              <form onSubmit={handleRequestCode} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Sending...' : 'Send reset code'}
                </button>
              </form>
            </>
          )}

          {step === 'code' && (
            <>
              <h1 className="text-2xl font-light tracking-tight mb-2">
                Enter reset code
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                We sent a 6-digit code to {email}. Check your inbox.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="code" className="block text-sm font-medium mb-2">
                    Reset code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-base font-mono text-center tracking-[0.5em] focus:border-neutral-900 dark:focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-base focus:border-neutral-900 dark:focus:border-white transition-colors"
                  />
                  <p className="mt-1 text-xs text-neutral-400">Minimum 8 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
              </form>

              <button
                onClick={() => setStep('email')}
                className="mt-4 w-full text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                ← Back to email
              </button>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-light tracking-tight mb-2">
                  Password reset!
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                  Your password has been updated. You can now sign in.
                </p>
                <Link
                  href="/login"
                  className="inline-block w-full py-3.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all duration-200 text-center"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}

          {step !== 'success' && (
            <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
              Remember your password?{' '}
              <Link href="/login" className="text-neutral-900 dark:text-white underline underline-offset-4">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

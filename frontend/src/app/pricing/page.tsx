'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createCheckout } from '@/lib/api';
import { useState } from 'react';
import TrustStrip from '@/components/TrustStrip';
import LegalFooter from '@/components/LegalFooter';

const tiers = [
  {
    name: 'Insight',
    key: 'insight',
    price: 15,
    description: 'Deterministic synthesis for individual profiles with preview interpretation.',
    features: [
      'Up to 3 profiles',
      'Deterministic synthesis',
      'AI preview access',
      'Personal dashboard',
    ],
  },
  {
    name: 'Integration',
    key: 'integration',
    price: 29,
    description: 'Multi-profile context with cross-system synthesis and broader continuity.',
    features: [
      'Unlimited profiles',
      'Systems view',
      'Constellations (view-only)',
      'AI preview access',
    ],
  },
  {
    name: 'Constellation',
    key: 'constellation',
    price: 59,
    description: 'Relational synthesis across people with full interpretation.',
    features: [
      'Full constellation creation',
      'Relational synthesis',
      'Full AI interpretation',
      'Priority compute',
    ],
  },
] as const;

type TierKey = typeof tiers[number]['key'];

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<TierKey | null>(null);

  const handleCheckout = async (tier: 'insight' | 'integration' | 'constellation') => {
    if (!isAuthenticated) {
      router.push('/register');
      return;
    }
    
    setLoading(tier);
    try {
      const { url } = await createCheckout(tier);
      router.push(url);
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
          </Link>
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/how-ai-works"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  How it works
                </Link>
                <Link
                  href="/trust"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Trust
                </Link>
                <Link 
                  href="/login" 
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Enter the Field
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Pricing Hero */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">
          Pricing for the spiritual rebel who wants traceability.
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
          Every plan uses the same deterministic synthesis engine. Higher tiers expand context depth, relational tooling, and AI capacity.
        </p>
        <TrustStrip className="mt-8" />
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className="border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col"
            >
              <div>
                <h3 className="text-xl font-medium">{tier.name}</h3>
                <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                  {tier.description}
                </p>
              </div>
              
              <div className="mt-8">
                <span className="text-4xl font-light">${tier.price}</span>
                <span className="text-neutral-400 dark:text-neutral-500 ml-1">/month</span>
              </div>
              
              <ul className="mt-10 space-y-4 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <svg className="w-4 h-4 mt-0.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-neutral-600 dark:text-neutral-400">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleCheckout(tier.key)}
                disabled={loading === tier.key}
                className="mt-10 w-full py-3 text-sm font-medium transition-all border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === tier.key ? 'Loading...' : 'Continue'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-xl font-medium mb-6">Why tiers?</h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p>
              Self-understanding is a practice, not a product. The tiered model reflects the
              progression from personal patterns to multi-person dynamics and timing sensitivity.
            </p>
            <p>
              Each tier unlocks computational depth and context scope. We aim for clear boundaries,
              predictable costs, and upgrade paths that respect your pace.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-600 max-w-2xl">
            Subscriptions are billed monthly. Cancel anytime. Your data remains accessible
            at your current tier level after cancellation.
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600 max-w-2xl">
            Defrag is for structured self-reflection. It is not predictive, diagnostic, or a substitute for professional medical, legal, or mental health care.
          </p>
        </div>
      </section>

      <LegalFooter className="border-t-0" />
    </main>
  );
}

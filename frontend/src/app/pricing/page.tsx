'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createCheckout } from '@/lib/api';
import { useState } from 'react';

const tiers = [
  {
    name: 'Insight',
    key: 'insight',
    price: 15,
    description: 'Personal clarity. Deterministic synthesis.',
    features: [
      'Up to 3 profiles',
      'Full readings and state models',
      'AI preview of deeper patterns',
      'Dashboard and history',
    ],
    cta: 'Begin with Insight',
    featured: false,
  },
  {
    name: 'Integration',
    key: 'integration',
    price: 29,
    description: 'Multi-profile reasoning. Pattern comparison.',
    features: [
      'Unlimited profiles',
      'Temporal overlays and check-ins',
      'Constellations (view only)',
      'AI preview across profiles',
    ],
    cta: 'Continue with Integration',
    featured: true,
  },
  {
    name: 'Constellation',
    key: 'constellation',
    price: 59,
    description: 'Full relational synthesis. AI as analytical partner.',
    features: [
      'Create and compute constellations',
      'Full AI synthesis across relationships',
      'Cross-profile pattern recognition',
      'Priority compute queue',
    ],
    cta: 'Enter Constellation',
    featured: false,
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
                  href="/login" 
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Pricing Hero */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">
          Choose your depth.
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
          Each tier builds on the last. Start where it feels right. 
          Your data carries forward as you grow.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`
                border p-8 flex flex-col
                ${tier.featured 
                  ? 'border-neutral-900 dark:border-white' 
                  : 'border-neutral-200 dark:border-neutral-800'
                }
              `}
            >
              <div>
                <h3 className="text-xl font-medium">{tier.name}</h3>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400 text-sm">
                  {tier.description}
                </p>
              </div>
              
              <div className="mt-6">
                <span className="text-4xl font-light">${tier.price}</span>
                <span className="text-neutral-400 dark:text-neutral-500 ml-1">/month</span>
              </div>
              
              <ul className="mt-8 space-y-3 flex-1">
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
                className={`
                  mt-8 w-full py-3 text-sm font-medium transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${tier.featured
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-80'
                    : 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }
                `}
              >
                {loading === tier.key ? 'Loading...' : tier.cta}
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
              Self-understanding is a practice, not a product. The tiered model reflects 
              the natural progression of inner work—from basic awareness, through 
              temporal sensitivity, to relational mapping.
            </p>
            <p>
              Each tier unlocks computational depth. We don&apos;t believe in restricting 
              access to insight. We believe in meeting you where you are.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-xs text-neutral-400 dark:text-neutral-600 max-w-2xl">
            All subscriptions are billed monthly. Cancel anytime. Your data remains 
            accessible at your current tier level after cancellation.
          </p>
        </div>
      </footer>
    </main>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createCheckout } from '@/lib/api';
import { useState } from 'react';
import TrustStrip from '@/components/TrustStrip';
import { SiteHeader, SiteFooter, FilmBackdrop, Section } from '@/components/marketing';

const tiers = [
  {
    name: 'Insight',
    subtitle: 'Personal',
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
    subtitle: 'Multi-profile',
    key: 'integration',
    price: 29,
    popular: true,
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
    subtitle: 'Relational',
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
    <>
      <SiteHeader />
      <main className="min-h-screen bg-white dark:bg-black">
        {/* Pricing Hero */}
        <Section className="relative">
          <FilmBackdrop src="/hero/mirror.webp" />
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight">
              Clarity at your pace.
            </h1>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
              Every plan uses the same deterministic synthesis engine. Higher tiers expand context depth,
              relational tooling, and AI interpretation capacity.
            </p>
            <TrustStrip className="mt-8" />
          </div>
        </Section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative rounded-2xl border p-8 flex flex-col backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                'popular' in tier && tier.popular
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-lg'
                  : 'border-neutral-200/60 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-950/50 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              {'popular' in tier && tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                  {tier.subtitle}
                </p>
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
                    <svg className="w-4 h-4 mt-0.5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-neutral-600 dark:text-neutral-400">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleCheckout(tier.key)}
                disabled={loading === tier.key}
                className={`mt-10 w-full py-3.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md ${
                  'popular' in tier && tier.popular
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200'
                }`}
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
              Each tier expands computational depth and context scope. We aim for clear boundaries,
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

      <SiteFooter />
    </main>
    </>
  );
}

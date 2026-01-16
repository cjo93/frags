'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createCheckout } from '@/lib/api';
import { useState } from 'react';
import { SiteHeader, SiteFooter, FilmBackdrop, Section } from '@/components/marketing';

const tiers = [
  {
    name: 'Insight',
    subtitle: 'Personal',
    key: 'insight',
    price: 15,
    description: 'Deterministic synthesis for individual profiles with preview interpretation.',
    features: ['Up to 3 profiles', 'Deterministic synthesis', 'AI preview access', 'Personal dashboard'],
  },
  {
    name: 'Integration',
    subtitle: 'Multi-profile',
    key: 'integration',
    price: 29,
    popular: true,
    description: 'Multi-profile context with cross-system synthesis and broader continuity.',
    features: ['Unlimited profiles', 'Systems view', 'Constellations (view-only)', 'AI preview access'],
  },
  {
    name: 'Constellation',
    subtitle: 'Relational',
    key: 'constellation',
    price: 59,
    description: 'Relational synthesis across people with full interpretation.',
    features: ['Full constellation creation', 'Relational synthesis', 'Full AI interpretation', 'Priority compute'],
  },
] as const;

type TierKey = (typeof tiers)[number]['key'];

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
            <h1 className="text-3xl md:text-4xl font-light tracking-tight fade-up">Clarity at your pace.</h1>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed fade-up fade-up-2">
              Every plan uses the same deterministic synthesis engine. Higher tiers expand context depth,
              relational tooling, and AI interpretation capacity.
            </p>
            <div className="mt-8 fade-up fade-up-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Private by default • Memory is optional • Exports are sanitized
            </div>
          </div>
        </Section>

        {/* Pricing Cards */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, idx) => {
              const isPopular = 'popular' in tier && tier.popular;
              return (
                <div
                  key={tier.key}
                  className={`relative rounded-2xl border p-8 flex flex-col backdrop-blur-sm hover-lift fade-up ${
                    idx === 1 ? 'fade-up-2' : idx === 2 ? 'fade-up-3' : ''
                  } ${
                    isPopular
                      ? 'border-neutral-900/25 dark:border-white/25 bg-neutral-50/80 dark:bg-neutral-900/50 shadow-lg soft-shimmer'
                      : 'border-neutral-200/60 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-950/50 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}

                  {/* faint linework */}
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.08] dark:opacity-[0.10]"
                    viewBox="0 0 400 400"
                    fill="none"
                  >
                    <path
                      d="M40 110 C120 40, 280 40, 360 110"
                      stroke="currentColor"
                      className="text-neutral-900 dark:text-white"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                    <path
                      d="M40 290 C120 360, 280 360, 360 290"
                      stroke="currentColor"
                      className="text-neutral-900 dark:text-white"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                    <path
                      d="M120 70 L200 200 L280 70"
                      stroke="currentColor"
                      className="text-neutral-900 dark:text-white"
                      strokeWidth="1"
                      strokeLinejoin="round"
                      opacity="0.7"
                    />
                    <circle
                      cx="200"
                      cy="200"
                      r="86"
                      stroke="currentColor"
                      className="text-neutral-900 dark:text-white"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  </svg>

                  <div className="relative">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                      {tier.subtitle}
                    </p>
                    <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-50">{tier.name}</h3>
                    <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                      {tier.description}
                    </p>

                    <div className="mt-8">
                      <span className="text-4xl font-light text-neutral-900 dark:text-neutral-50">${tier.price}</span>
                      <span className="text-neutral-400 dark:text-neutral-500 ml-1">/month</span>
                    </div>

                    <ul className="mt-10 space-y-4 flex-1">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <svg
                            className="w-4 h-4 mt-0.5 text-neutral-500 dark:text-neutral-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-neutral-600 dark:text-neutral-400">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleCheckout(tier.key)}
                      disabled={loading === tier.key}
                      className="mt-10 w-full py-3.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
                    >
                      {loading === tier.key ? 'Loading…' : 'Continue'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Philosophy */}
        <section className="border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-xl font-medium mb-6 fade-up">Why tiers?</h2>
            <div className="grid md:grid-cols-2 gap-8 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed fade-up fade-up-2">
              <p>
                Self-understanding is a practice, not a product. The tiered model reflects the progression from
                personal patterns to multi-person dynamics and timing sensitivity.
              </p>
              <p>
                Each tier expands computational depth and context scope. We aim for clear boundaries, predictable
                costs, and upgrade paths that respect your pace.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
            <p className="text-xs text-neutral-400 dark:text-neutral-600 max-w-2xl">
              Subscriptions are billed monthly. Cancel anytime. Your data remains accessible at your current tier level
              after cancellation.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600 max-w-2xl">
              Defrag is for structured self-reflection. It is not predictive, diagnostic, or a substitute for
              professional medical, legal, or mental health care.
            </p>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}

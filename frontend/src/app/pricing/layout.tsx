import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Pricing — Insight, Integration, and Constellation Plans",
  description: "Choose your tier: Insight ($15/mo) for personal synthesis, Integration ($29/mo) for multi-profile context, Constellation ($59/mo) for relational dynamics.",
  openGraph: {
    title: "Defrag Pricing — Plans for Every Level",
    description: "From individual reflection to relational synthesis. Clear tiers, predictable costs, cancel anytime.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

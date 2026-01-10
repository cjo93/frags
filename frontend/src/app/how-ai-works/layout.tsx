import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "How It Works — Deterministic Synthesis + AI Interpretation",
  description: "Two layers: reproducible computation (astrology, Human Design, Gene Keys) plus optional AI that explains patterns without inventing data or making predictions.",
  openGraph: {
    title: "How Defrag Works — Mirror, Not Mandate",
    description: "Deterministic synthesis meets AI interpretation. Computed patterns you can audit; explanations that cite sources.",
  },
};

export default function HowAIWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

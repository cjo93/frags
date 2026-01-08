'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import TrustStrip from '@/components/TrustStrip';
import LegalFooter from '@/components/LegalFooter';

export default function HowAIWorksPage() {
  const { isAuthenticated } = useAuth();

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
                  href="/pricing" 
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Pricing
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
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">
          How AI works in Defrag
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Deterministic compute first. AI interpretation second. Clear boundaries throughout.
        </p>
        <TrustStrip className="mt-6" />
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-6 pb-24 space-y-16">
        
        {/* Section: Two Layers */}
        <div>
          <h2 className="text-xl font-medium mb-4">Two distinct layers</h2>
          <div className="space-y-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p>
              Defrag uses <strong className="text-neutral-900 dark:text-white">deterministic synthesis</strong> as its foundation. 
              Your natal chart, numerology profile, Human Design, and Gene Keys are computed using established algorithms—not AI. 
              These calculations are reproducible, auditable, and don&apos;t change based on model updates.
            </p>
            <p>
              AI enters only as an <strong className="text-neutral-900 dark:text-white">interpretation layer</strong>—an assistant that 
              helps you explore and connect the computed data. It can explain what a Sun square Mars means, or how your 
              Profile 4/6 might express in relationships. It never invents placements or generates data.
            </p>
          </div>
        </div>

        {/* Section: What AI Can Do */}
        <div>
          <h2 className="text-xl font-medium mb-4">What AI does</h2>
          <ul className="space-y-3 text-neutral-600 dark:text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
              <span>Explains computed layers in natural language</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
              <span>Connects patterns across different systems (astrology + numerology + Human Design)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
              <span>Answers questions about your chart with citations to computed placements</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
              <span>Suggests where to look for deeper understanding</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
              <span>Transcribes voice notes into check-in entries</span>
            </li>
          </ul>
        </div>

        {/* Section: What AI Cannot Do */}
        <div>
          <h2 className="text-xl font-medium mb-4">What AI doesn&apos;t do</h2>
          <ul className="space-y-3 text-neutral-600 dark:text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
              <span>Generate or invent chart placements</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
              <span>Make predictions about your life</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
              <span>Provide therapy, medical, or financial advice</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
              <span>Access data outside your profile context</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
              <span>Remember conversations across sessions without explicit memory opt-in</span>
            </li>
          </ul>
        </div>

        {/* Section: Privacy */}
        <div>
          <h2 className="text-xl font-medium mb-4">Privacy and data handling</h2>
          <div className="space-y-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p>
              When you use AI features, your profile data (chart placements, check-ins, constellation relationships) 
              is sent to the AI provider as context. This data is:
            </p>
            <ul className="space-y-2 ml-6">
              <li>• <strong className="text-neutral-900 dark:text-white">Not stored</strong> by the AI provider beyond the request</li>
              <li>• <strong className="text-neutral-900 dark:text-white">Not used</strong> to train AI models</li>
              <li>• <strong className="text-neutral-900 dark:text-white">Encrypted</strong> in transit via TLS</li>
              <li>• <strong className="text-neutral-900 dark:text-white">Scoped</strong> to only the profile you&apos;re viewing</li>
            </ul>
            <p>
              We currently use <strong className="text-neutral-900 dark:text-white">Cloudflare Workers AI</strong> for inference. 
              Your data never leaves Cloudflare&apos;s network and is processed on their secure edge infrastructure.
            </p>
            <p>
              Exports are rendered artifacts with expiring links, and request IDs are attached end-to-end for auditability.
            </p>
          </div>
        </div>

        {/* Section: Model Info */}
        <div>
          <h2 className="text-xl font-medium mb-4">Models we use</h2>
          <div className="space-y-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Chat & Interpretation</span>
                <code className="text-sm text-neutral-500 dark:text-neutral-400">Llama 3.1 8B</code>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Open-source model from Meta, run on Cloudflare&apos;s infrastructure
              </p>
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Voice Transcription</span>
                <code className="text-sm text-neutral-500 dark:text-neutral-400">Whisper</code>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                OpenAI&apos;s open-source speech recognition model
              </p>
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg opacity-50">
              <div className="flex items-center justify-between">
                <span className="font-medium">Image Generation</span>
                <code className="text-sm text-neutral-500 dark:text-neutral-400">SDXL</code>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Coming soon — Stable Diffusion XL for visual synthesis
              </p>
            </div>
          </div>
        </div>

        {/* Section: Tier Access */}
        <div>
          <h2 className="text-xl font-medium mb-4">AI access by tier</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left py-3 font-medium">Feature</th>
                  <th className="text-center py-3 font-medium">Free</th>
                  <th className="text-center py-3 font-medium">Insight</th>
                  <th className="text-center py-3 font-medium">Integration</th>
                  <th className="text-center py-3 font-medium">Constellation</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600 dark:text-neutral-400">
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-3">Deterministic synthesis</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-3">AI chat (preview)</td>
                  <td className="text-center">—</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">—</td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-3">AI chat (full)</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                  <td className="text-center">✓</td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-3">Voice transcription</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                  <td className="text-center">✓</td>
                </tr>
                <tr>
                  <td className="py-3">Image generation</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                  <td className="text-center">Soon</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Philosophy */}
        <div>
          <h2 className="text-xl font-medium mb-4">Our philosophy</h2>
          <div className="space-y-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p>
              AI is a lens, not an oracle. We use it to help you understand the patterns that deterministic 
              systems reveal—not to replace your own discernment.
            </p>
            <p>
              When available, AI responses include citations to the computed layers they draw from. You can trace
              an interpretation back to its source data. This isn&apos;t about blind trust; it&apos;s about informed exploration.
            </p>
            <p>
              We&apos;ll continue to be transparent about what models we use, how your data flows, and what 
              limitations exist. AI is a tool, and tools work best when you understand how they work.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h3 className="font-medium">Questions?</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                We&apos;re happy to explain anything in more detail.
              </p>
            </div>
            <Link
              href="mailto:support@defrag.app"
              className="px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>

      </section>

      <LegalFooter />
    </main>
  );
}

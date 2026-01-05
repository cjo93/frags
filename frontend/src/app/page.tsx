import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Defrag
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              href="/pricing" 
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Pricing
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
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight max-w-3xl">
            Understand patterns across people, time, and systems.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Without prediction, diagnosis, or advice.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Begin your synthesis
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-lg font-medium mb-3">Profiles</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Create natal profiles for yourself and others. Track psychological state over time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Systems</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Astrology, numerology, and Jungian overlays computed from your birth data.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Constellations</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Map relationships. Understand family dynamics through Bowen theory integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Not Medical Advice
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed">
                Defrag is a tool for self-reflection and personal exploration. It is not a substitute 
                for professional mental health care, therapy, or medical advice. If you are experiencing 
                a mental health crisis, please contact a qualified professional.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Your Data
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed">
                Your birth data and profile information is stored securely and encrypted at rest. 
                We do not sell your data or share it with third parties. You can delete your data at any time.
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-xs text-neutral-400 dark:text-neutral-600">
            <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

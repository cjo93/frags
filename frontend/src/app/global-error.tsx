'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-light tracking-tight mb-4">
              Something went wrong
            </h1>
            <p className="text-neutral-600 mb-8">
              We encountered an unexpected error. Please try again.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-neutral-900 text-white text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

import Link from 'next/link';

type LegalFooterProps = {
  className?: string;
};

export default function LegalFooter({ className = '' }: LegalFooterProps) {
  return (
    <footer className={`border-t border-neutral-200 dark:border-neutral-800 ${className}`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-6 text-xs text-neutral-400 dark:text-neutral-600">
          <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
            Terms
          </Link>
          <Link href="/trust" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
            Trust & Security
          </Link>
        </div>
      </div>
    </footer>
  );
}

type TrustStripProps = {
  className?: string;
};

const TRUST_ITEMS = [
  'Deterministic compute',
  'Optional memory',
  'Request IDs + rate limits',
  'Expiring exports',
  'No cross-user sharing',
];

export default function TrustStrip({ className = '' }: TrustStripProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {TRUST_ITEMS.map((item) => (
        <span
          key={item}
          className="px-3 py-1 text-xs border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 bg-white/60 dark:bg-neutral-900/60"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

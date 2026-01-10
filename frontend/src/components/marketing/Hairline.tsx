interface HairlineProps {
  className?: string;
}

export default function Hairline({ className = '' }: HairlineProps) {
  return (
    <div className={`h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent ${className}`} />
  );
}

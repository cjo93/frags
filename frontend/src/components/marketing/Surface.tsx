import { ReactNode } from 'react';

interface SurfaceProps {
  children: ReactNode;
  className?: string;
}

export default function Surface({ children, className = '' }: SurfaceProps) {
  return (
    <div className={`bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/50 ${className}`}>
      {children}
    </div>
  );
}

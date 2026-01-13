'use client';

import { useEffect, useMemo, useState, useRef } from 'react';

interface Mantra {
  saying: string;
  translation: string;
}

interface RotatingMantrasProps {
  mantras: Mantra[];
  className?: string;
}

export default function RotatingMantras({ mantras, className = '' }: RotatingMantrasProps) {
  const initialized = useRef(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
    const t = setInterval(() => {
      setIsTransitioning(true);
      // Fade out, then change content, then fade in
      setTimeout(() => {
        setSeed((s) => s + 1);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 400);
    }, 12000);
    return () => clearInterval(t);
  }, []);

  const order = useMemo(() => {
    const start = seed % mantras.length;
    return [0, 1, 2].map((i) => mantras[(start + i) % mantras.length]);
  }, [seed, mantras]);

  return (
    <div className={`grid gap-4 sm:grid-cols-3 ${className}`}>
      {order.map((m, idx) => (
        <div 
          key={m.saying} 
          className={`p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 
            bg-white/40 dark:bg-neutral-950/40 backdrop-blur-sm
            transition-all duration-500 ease-out
            ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
          style={{
            transitionDelay: `${idx * 50}ms`
          }}
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{m.saying}</p>
          <p className="mt-2 text-base font-medium text-neutral-900 dark:text-neutral-50">{m.translation}</p>
        </div>
      ))}
    </div>
  );
}

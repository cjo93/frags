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

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
    const t = setInterval(() => setSeed((s) => s + 1), 12000);
    return () => clearInterval(t);
  }, []);

  const order = useMemo(() => {
    const start = seed % mantras.length;
    return [0, 1, 2].map((i) => mantras[(start + i) % mantras.length]);
  }, [seed, mantras]);

  return (
    <div className={`grid gap-4 sm:grid-cols-3 ${className}`}>
      {order.map((m) => (
        <div key={m.saying} className="p-5 border border-neutral-200 dark:border-neutral-800 transition-opacity duration-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{m.saying}</p>
          <p className="mt-2 text-base font-medium">{m.translation}</p>
        </div>
      ))}
    </div>
  );
}

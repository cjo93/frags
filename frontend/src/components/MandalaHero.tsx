'use client';

interface MandalaHeroProps {
  state?: "CLEAR" | "FOG" | "STORM" | "HEAT";
}

export default function MandalaHero({ state = "CLEAR" }: MandalaHeroProps) {
  const ringClass =
    state === "CLEAR" ? "stroke-emerald-400/40" :
    state === "FOG" ? "stroke-neutral-400/30" :
    state === "HEAT" ? "stroke-orange-400/40" :
    "stroke-red-400/45";

  const fillClass =
    state === "CLEAR" ? "fill-emerald-300/5" :
    state === "FOG" ? "fill-neutral-300/5" :
    state === "HEAT" ? "fill-orange-300/5" :
    "fill-red-300/5";

  return (
    <div className="w-64 h-64 md:w-80 md:h-80">
      <svg viewBox="0 0 200 200" className="w-full h-full animate-[spin_24s_linear_infinite]" aria-label="Mandala visual">
        <defs>
          <radialGradient id="hero-mandala-g" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopOpacity="0.2" />
            <stop offset="100%" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" className={`${ringClass} ${fillClass}`} strokeWidth="0.5" fill="url(#hero-mandala-g)" />
        <circle cx="100" cy="100" r="70" className={ringClass} strokeWidth="0.4" fill="none" />
        <circle cx="100" cy="100" r="50" className={ringClass} strokeWidth="0.3" fill="none" />
        <circle cx="100" cy="100" r="30" className={ringClass} strokeWidth="0.2" fill="none" />
        {/* Radial lines */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 100 + 30 * Math.cos(angle);
          const y1 = 100 + 30 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={ringClass}
              strokeWidth="0.2"
            />
          );
        })}
      </svg>
    </div>
  );
}

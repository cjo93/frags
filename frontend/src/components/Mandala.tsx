'use client';

interface MandalaProps {
  state: "CLEAR" | "FOG" | "STORM" | "HEAT";
}

export default function Mandala({ state }: MandalaProps) {
  const label =
    state === "CLEAR" ? "calm" :
    state === "FOG" ? "fogged" :
    state === "HEAT" ? "overheated" :
    "storm";

  const spin = state === "STORM" ? "animate-[spin_6s_linear_infinite]" : "animate-[spin_18s_linear_infinite]";
  const pulse = state === "HEAT" ? "animate-[pulse_3.5s_ease-in-out_infinite]" : "";

  const ringClass =
    state === "CLEAR" ? "stroke-emerald-400/50" :
    state === "FOG" ? "stroke-neutral-400/40" :
    state === "HEAT" ? "stroke-orange-400/50" :
    "stroke-red-400/55";

  const fillClass =
    state === "CLEAR" ? "fill-emerald-300/10" :
    state === "FOG" ? "fill-neutral-300/10" :
    state === "HEAT" ? "fill-orange-300/10" :
    "fill-red-300/10";

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 p-6 mb-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-500">Mirror</p>
          <h2 className="mt-3 text-xl font-medium tracking-tight">Mandala</h2>
          <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-md">
            A quiet readout of the current field. {label}. No action required.
          </p>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">
            &quot;Still waters run deep.&quot; Silence is valid data.
          </p>
        </div>

        <div className="w-40 h-40 sm:w-44 sm:h-44">
          <svg viewBox="0 0 200 200" className={`w-full h-full ${spin} ${pulse}`} aria-label={`Mandala ${label}`}>
            <defs>
              <radialGradient id="mandala-g" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopOpacity="0.35" />
                <stop offset="100%" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="86" className={`${fillClass}`} />
            <circle cx="100" cy="100" r="86" className={`fill-none stroke-[2] ${ringClass}`} />
            <circle cx="100" cy="100" r="62" className={`fill-none stroke-[1.5] ${ringClass}`} />
            <circle cx="100" cy="100" r="38" className={`fill-none stroke-[1.25] ${ringClass}`} />
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * Math.PI) / 6;
              const x1 = 100 + Math.cos(a) * 38;
              const y1 = 100 + Math.sin(a) * 38;
              const x2 = 100 + Math.cos(a) * 86;
              const y2 = 100 + Math.sin(a) * 86;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`stroke-[1] ${ringClass}`}
                  strokeLinecap="round"
                  opacity={0.55}
                />
              );
            })}
            <circle cx="100" cy="100" r="18" fill="url(#mandala-g)" />
          </svg>
        </div>
      </div>
    </div>
  );
}

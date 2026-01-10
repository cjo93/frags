interface FilmBackdropProps {
  imageSrc?: string;
  imageOpacity?: string;
}

export default function FilmBackdrop({ imageSrc, imageOpacity = "opacity-[0.18]" }: FilmBackdropProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Photo layer (optional) */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${imageOpacity} dark:opacity-[0.14] scale-[1.06]`}
          style={{ animation: "kenburns 28s ease-in-out infinite" }}
        />
      )}
      {/* Soft orbs */}
      <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-neutral-200/40 to-transparent blur-3xl dark:from-neutral-700/20" />
      <div className="absolute -bottom-32 right-[-8rem] h-80 w-80 rounded-full bg-gradient-to-tr from-neutral-200/30 to-transparent blur-3xl dark:from-neutral-700/15" />
      {/* Fog wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/30 to-white/85 dark:from-black/70 dark:via-black/35 dark:to-black/85" />
      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_140px_rgba(0,0,0,0.25)]" />
      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

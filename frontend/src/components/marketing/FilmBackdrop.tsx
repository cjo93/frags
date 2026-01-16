import { cn } from "@/lib/cn";

type FilmBackdropProps = {
  src: string; // e.g. "/hero/field.webp"
  className?: string;
  imageClassName?: string;
  opacityClassName?: string; // fine-tune per page, e.g. "opacity-[0.16] dark:opacity-[0.12]"
};

export default function FilmBackdrop({
  src,
  className,
  imageClassName,
  opacityClassName = "opacity-[0.22] dark:opacity-[0.16]",
}: FilmBackdropProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <img
        src={src}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover scale-[1.06] film-kenburns",
          opacityClassName,
          imageClassName
        )}
        style={{ animation: "kenburns 28s ease-in-out infinite" }}
      />
      {/* fog wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/30 to-white/85 dark:from-black/70 dark:via-black/35 dark:to-black/85" />
      {/* faint vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.10)] dark:shadow-[inset_0_0_140px_rgba(0,0,0,0.35)]" />
      {/* grain overlay - significantly reduced for premium feel */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay film-grain"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"160\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"160\" height=\"160\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>')",
          animation: "grain 12s steps(2) infinite",
        }}
      />
    </div>
  );
}

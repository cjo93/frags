import { cn } from "@/lib/cn";

type SurfaceProps = {
  className?: string;
  children: React.ReactNode;
};

export default function Surface({ className, children }: SurfaceProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl bg-white/60 dark:bg-black/20 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
      />
      <div className="relative rounded-2xl p-7">{children}</div>
    </div>
  );
}

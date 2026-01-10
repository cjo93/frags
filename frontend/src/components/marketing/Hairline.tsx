import { cn } from "@/lib/cn";

export default function Hairline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-neutral-800",
        className
      )}
    />
  );
}

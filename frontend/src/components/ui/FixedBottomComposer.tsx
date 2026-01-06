"use client";

import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { cn } from "@/lib/utils";

interface FixedBottomComposerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A fixed-bottom container that moves above the iOS keyboard.
 * Uses visualViewport to detect keyboard height and translates accordingly.
 * Includes safe-area padding for notched devices.
 */
export function FixedBottomComposer({ children, className }: FixedBottomComposerProps) {
  const keyboardInset = useKeyboardInset();

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 transition-transform duration-100",
        className
      )}
      style={{
        paddingBottom: `max(env(safe-area-inset-bottom), 0.5rem)`,
        paddingLeft: `max(env(safe-area-inset-left), 1rem)`,
        paddingRight: `max(env(safe-area-inset-right), 1rem)`,
        transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
}

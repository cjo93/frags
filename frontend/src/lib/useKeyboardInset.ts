"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the keyboard inset in pixels on mobile browsers using visualViewport API.
 * When the iOS keyboard opens, visualViewport.height shrinks while innerHeight stays the same.
 * Returns the difference, which can be used to offset fixed-bottom elements.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      // When keyboard opens, visualViewport.height shrinks.
      // The inset is the difference between layout viewport and visual viewport.
      const layoutH = window.innerHeight;
      const visualH = vv.height;
      const diff = Math.max(0, Math.round(layoutH - visualH));
      setInset(diff);
    };

    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);

    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return inset;
}

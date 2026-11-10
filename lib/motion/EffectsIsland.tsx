"use client";

import { useEffect } from "react";

/**
 * Loads page-wide motion after the page has loaded and the browser is idle,
 * off the critical path. Skipped entirely under reduced motion.
 */
export function EffectsIsland() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    let idle = 0;
    let timer = 0;
    const load = () => {
      void import("./effects")
        .then((mod) => mod.startEffects())
        .then((cleanup) => {
          if (cancelled) cleanup();
          else stop = cleanup;
        });
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(load, { timeout: 2000 });
      } else {
        timer = window.setTimeout(load, 800);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
      stop?.();
    };
  }, []);
  return null;
}

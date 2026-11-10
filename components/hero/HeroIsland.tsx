"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

/**
 * Swaps the server-rendered static map for the animated one once the page
 * has loaded and the browser is idle, keeping the animation off the
 * critical path. With reduced motion the static map simply stays.
 */
export function HeroIsland({ children }: { children: ReactNode }) {
  const [Canvas, setCanvas] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const load = () => {
      void import("./HeroCanvas").then((mod) => {
        if (!cancelled) setCanvas(() => mod.default);
      });
    };
    const schedule = () => {
      // Safari lacks requestIdleCallback; fall back to a short delay.
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(load, { timeout: 2500 });
      } else {
        timer = window.setTimeout(load, 1200);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="hero-art-wrap" data-hero-ready={Canvas ? "true" : "false"}>
      {Canvas ? <Canvas /> : children}
    </div>
  );
}

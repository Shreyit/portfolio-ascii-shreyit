"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Mounts the ambient backdrop once the page has loaded and the browser is
 * idle — never under reduced motion, and never on the critical path.
 */
export function AmbientIsland() {
  const [Field, setField] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const load = () => {
      void import("./AmbientField").then((mod) => {
        if (!cancelled) setField(() => mod.default);
      });
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(load, { timeout: 3000 });
      } else {
        timer = window.setTimeout(load, 1500);
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

  return Field ? <Field /> : null;
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { Statement } from "./schema";

interface PlaygroundProps {
  headingId: string;
  statements: Statement[];
  counts: Record<string, number>;
}

interface SqlIslandProps extends PlaygroundProps {
  /** Server-rendered static view, shown until the playground loads. */
  children: ReactNode;
}

/**
 * Loads the interactive playground only when it nears the viewport or the
 * visitor reaches for it, keeping it off the first-load bundle.
 */
export function SqlIsland({ children, ...props }: SqlIslandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [Playground, setPlayground] =
    useState<ComponentType<PlaygroundProps> | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    const load = () => {
      observer.disconnect();
      element.removeEventListener("pointerenter", load);
      element.removeEventListener("focusin", load);
      void import("./SqlPlayground").then((mod) => {
        if (!cancelled) setPlayground(() => mod.default);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) load();
      },
      // Load once the playground is genuinely on screen (or the visitor
      // reaches for it) — not merely near the fold on first paint.
      { threshold: 0.15 },
    );
    observer.observe(element);
    element.addEventListener("pointerenter", load);
    element.addEventListener("focusin", load);
    return () => {
      cancelled = true;
      observer.disconnect();
      element.removeEventListener("pointerenter", load);
      element.removeEventListener("focusin", load);
    };
  }, []);

  return (
    <div ref={ref} data-sql-ready={Playground ? "true" : "false"}>
      {Playground ? <Playground {...props} /> : children}
    </div>
  );
}

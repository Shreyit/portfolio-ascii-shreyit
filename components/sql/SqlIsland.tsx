"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLoadWhenVisible } from "@/lib/use-load-when-visible";
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

/** Loads the interactive playground only when it nears the viewport or the visitor reaches for it, keeping it off the first-load bundle. */
export function SqlIsland({ children, ...props }: SqlIslandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useLoadWhenVisible(ref, 0.15);
  const [Playground, setPlayground] =
    useState<ComponentType<PlaygroundProps> | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void import("./SqlPlayground").then((mod) => {
      if (!cancelled) setPlayground(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} data-sql-ready={Playground ? "true" : "false"}>
      {Playground ? <Playground {...props} /> : children}
    </div>
  );
}

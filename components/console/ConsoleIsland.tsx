"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLoadWhenVisible } from "@/lib/use-load-when-visible";
import type { Cart } from "./carts";

type Lab = ComponentType<{ carts: Cart[] }>;

/** Loads the playable console once it is on screen. */
export function ConsoleIsland({
  carts,
  children,
}: {
  carts: Cart[];
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useLoadWhenVisible(ref);
  const [LabComponent, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void import("./SkillConsole").then((mod) => {
      if (!cancelled) setLab(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} data-console-ready={LabComponent ? "true" : "false"}>
      {LabComponent ? <LabComponent carts={carts} /> : children}
    </div>
  );
}

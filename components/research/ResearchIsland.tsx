"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLoadWhenVisible } from "@/lib/use-load-when-visible";
import type { ResearchData } from "./ResearchView";

type Lab = ComponentType<{ idBase: string; data: ResearchData }>;

/** Loads the interactive explorer once it is on screen. */
export function ResearchIsland({
  idBase,
  data,
  children,
}: {
  idBase: string;
  data: ResearchData;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useLoadWhenVisible(ref);
  const [LabComponent, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void import("./ResearchLab").then((mod) => {
      if (!cancelled) setLab(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} data-research-ready={LabComponent ? "true" : "false"}>
      {LabComponent ? <LabComponent idBase={idBase} data={data} /> : children}
    </div>
  );
}

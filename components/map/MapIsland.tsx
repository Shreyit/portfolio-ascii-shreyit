"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLoadWhenVisible } from "@/lib/use-load-when-visible";
import type { JourneyStop } from "./MapView";

type Lab = ComponentType<{ stops: JourneyStop[] }>;

/** Loads the interactive map (and its boundary data) once it is on screen. */
export function MapIsland({
  stops,
  children,
}: {
  stops: JourneyStop[];
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useLoadWhenVisible(ref);
  const [LabComponent, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void import("./MapLab").then((mod) => {
      if (!cancelled) setLab(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} data-map-ready={LabComponent ? "true" : "false"}>
      {LabComponent ? <LabComponent stops={stops} /> : children}
    </div>
  );
}

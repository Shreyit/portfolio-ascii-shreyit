"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLoadWhenVisible } from "@/lib/use-load-when-visible";

type Lab = ComponentType<{ idBase: string }>;

/** Loads the simulator once it is on screen; until then the static view shows. */
export function InfraIsland({
  idBase,
  children,
}: {
  idBase: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useLoadWhenVisible(ref);
  const [LabComponent, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void import("./InfraLab").then((mod) => {
      if (!cancelled) setLab(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} data-infra-ready={LabComponent ? "true" : "false"}>
      {LabComponent ? <LabComponent idBase={idBase} /> : children}
    </div>
  );
}

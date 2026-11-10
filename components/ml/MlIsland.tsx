"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLoadWhenVisible } from "@/lib/use-load-when-visible";

type LabComponent = ComponentType<{ idBase: string }>;

/** Loads the interactive lab once it is on screen; until then the server-rendered view shows. */
export function MlIsland({
  idBase,
  children,
}: {
  idBase: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useLoadWhenVisible(ref);
  const [Lab, setLab] = useState<LabComponent | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void import("./MlLab").then((mod) => {
      if (!cancelled) setLab(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} data-ml-ready={Lab ? "true" : "false"}>
      {Lab ? <Lab idBase={idBase} /> : children}
    </div>
  );
}

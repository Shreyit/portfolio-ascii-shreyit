"use client";

import { useEffect, useRef } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { CanvasRenderer } from "@/components/ascii/engine/renderer";
import { scheduler } from "@/components/ascii/engine/scheduler";
import type { PointerInput } from "@/components/ascii/engine/scene";
import { drawField } from "./field";

// Target cell size in CSS px (the font follows from it).
const CELL_W = 11;
const CELL_H = 22;

/**
 * Full-viewport ASCII backdrop behind the page. Fixed, non-interactive
 * (pointer-events: none) and opaque content panels sit above it, so it only
 * shows in the blank areas. It reads the pointer from the window.
 */
export default function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let renderer: CanvasRenderer | null = null;
    let grid: AsciiGrid | null = null;
    let fade = 0;
    const pointer: PointerInput = { x: 0, y: 0, active: false };
    const target: PointerInput = { x: 0, y: 0, active: false };

    const build = async () => {
      renderer?.destroy();
      const w = window.innerWidth;
      const h = window.innerHeight;
      grid = new AsciiGrid(Math.ceil(w / CELL_W), Math.ceil(h / CELL_H));
      const next = new CanvasRenderer(canvas, grid, {
        fontFamily: getComputedStyle(canvas).fontFamily,
        maxDpr: 1.5,
      });
      renderer = next;
      await next.init(w, h);
      if (disposed) next.destroy();
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => void build(), 200);
    };
    const onMove = (event: PointerEvent) => {
      if (!grid) return;
      target.x = (event.clientX / window.innerWidth) * grid.cols;
      target.y = (event.clientY / window.innerHeight) * grid.rows;
      target.active = event.pointerType === "mouse";
    };
    const onLeave = () => {
      target.active = false;
    };

    void build();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    const handle = scheduler.register({
      fps: 20,
      update(timeMs, dtMs) {
        if (!grid || !renderer) return;
        const k = Math.min(1, dtMs / 180);
        fade += ((target.active ? 1 : 0) - fade) * k;
        pointer.x += (target.x - pointer.x) * (pointer.active ? k * 2 : 1);
        pointer.y += (target.y - pointer.y) * (pointer.active ? k * 2 : 1);
        pointer.active = target.active;
        drawField(grid, timeMs / 1000, pointer, fade);
        renderer.render();
      },
    });

    return () => {
      disposed = true;
      handle.dispose();
      renderer?.destroy();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="ambient-field" aria-hidden="true" />
  );
}

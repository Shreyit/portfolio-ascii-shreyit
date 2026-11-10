"use client";

import { useEffect, useRef } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { CanvasRenderer } from "@/components/ascii/engine/renderer";
import { scheduler } from "@/components/ascii/engine/scheduler";
import type { PointerInput } from "@/components/ascii/engine/scene";
import { drawField } from "./field";

// Target cell size in CSS px (the font follows from it).
const CELL_W = 7;
const CELL_H = 15;

/**
 * Full-viewport ASCII backdrop behind the page. Fixed and non-interactive
 * (pointer-events: none); glass panels sit above it and it is calmer
 * under the central reading column. It reads the pointer from the window: the field is
 * revealed softly around it.
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
    let hero: { x: number; y: number; rx: number; ry: number } | null = null;
    let lastScan = -Infinity;
    const pointer: PointerInput = { x: 0, y: 0, active: false };
    const target: PointerInput = { x: 0, y: 0, active: false };

    const build = async () => {
      renderer?.destroy();
      const w = window.innerWidth;
      const h = window.innerHeight;
      grid = new AsciiGrid(Math.ceil(w / CELL_W), Math.ceil(h / CELL_H));
      const next = new CanvasRenderer(canvas, grid, {
        fontFamily: getComputedStyle(canvas).fontFamily,
        // Background texture: 1x is plenty and quarters the fill cost on retina.
        maxDpr: 1,
      });
      renderer = next;
      await next.init(w, h);
      if (disposed) next.destroy();
    };

    const toCells = (clientX: number, clientY: number) => ({
      x: clientX / CELL_W,
      y: clientY / CELL_H,
    });

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => void build(), 200);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const c = toCells(event.clientX, event.clientY);
      target.x = c.x;
      target.y = c.y;
      target.active = true;
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
        const k = Math.min(1, dtMs / 220);
        fade += ((target.active ? 1 : 0) - fade) * k;
        pointer.x += (target.x - pointer.x) * (pointer.active ? k : 1);
        pointer.y += (target.y - pointer.y) * (pointer.active ? k : 1);
        pointer.active = target.active;

        const y = window.scrollY;
        const vh = window.innerHeight;
        if (timeMs - lastScan > 1500) {
          lastScan = timeMs;
          // Hero position in page coordinates (read here, not per frame).
          const r = document
            .querySelector(".hero-art")
            ?.getBoundingClientRect();
          hero = r?.width
            ? {
                x: (r.left + r.width / 2) / CELL_W,
                y: (r.top + y + r.height / 2) / CELL_H,
                rx: r.width / CELL_W / 1.05,
                ry: r.height / CELL_H / 1.1,
              }
            : null;
        }

        // Strong at the top, a little calmer further down.
        const top = Math.min(1, Math.max(0, y / vh - 0.2));
        const intensity = 1 - 0.3 * top;

        drawField(grid, timeMs / 1000, pointer, fade, {
          intensity,
          scroll: y / CELL_H,
          shade: hero ? { ...hero, y: hero.y - y / CELL_H } : null,
        });
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

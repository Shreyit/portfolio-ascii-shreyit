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
/** Overall brightness of the backdrop. */
const INTENSITY = 0.9;

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
    let shades: { x: number; y: number; rx: number; ry: number }[] = [];
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
      // No glow behind the focal art: it would light up through it.
      target.active = !(event.target as Element | null)?.closest?.(
        ".hero-art, .portrait-art",
      );
    };
    const onLeave = () => {
      target.active = false;
    };

    void build();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    const handle = scheduler.register({
      fps: 16,
      update(timeMs, dtMs) {
        if (!grid || !renderer) return;
        const k = Math.min(1, dtMs / 220);
        fade += ((target.active ? 1 : 0) - fade) * k;
        pointer.x += (target.x - pointer.x) * (pointer.active ? k : 1);
        pointer.y += (target.y - pointer.y) * (pointer.active ? k : 1);
        pointer.active = target.active;

        const y = window.scrollY;
        if (timeMs - lastScan > 1500) {
          lastScan = timeMs;
          // Focal art (name, portrait) in page coordinates, read here
          // rather than per frame.
          shades = [];
          for (const el of document.querySelectorAll(
            ".hero-art, .portrait-art",
          )) {
            const r = el.getBoundingClientRect();
            if (!r.width) continue;
            shades.push({
              x: (r.left + r.width / 2) / CELL_W,
              y: (r.top + y + r.height / 2) / CELL_H,
              rx: r.width / CELL_W / 1.05,
              ry: r.height / CELL_H / 1.1,
            });
          }
        }

        // A fixed backdrop: nothing here depends on how far the page is
        // scrolled (only the shades, which track the art), so it never
        // jumps or changes tone while scrolling.
        drawField(grid, timeMs / 1000, pointer, fade, {
          intensity: INTENSITY,
          shade: shades.map((sh) => ({ ...sh, y: sh.y - y / CELL_H })),
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

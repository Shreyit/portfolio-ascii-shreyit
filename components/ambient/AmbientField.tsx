"use client";

import { useEffect, useRef } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { CanvasRenderer } from "@/components/ascii/engine/renderer";
import { scheduler } from "@/components/ascii/engine/scheduler";
import type { PointerInput } from "@/components/ascii/engine/scene";
import { drawField, quietMask } from "./field";

// Target cell size in CSS px (the font follows from it).
const CELL_W = 7;
const CELL_H = 15;
/** Text the field fades out behind. Panels and cards are opaque already. */
const QUIET = [
  "main h1",
  "main h2",
  "main h3",
  "main p",
  "main li",
  ".site-header",
  ".site-footer a",
  ".site-footer > span",
].join(", ");

/** The tight box of an element's text (block elements span full width). */
function textBox(el: Element): DOMRect {
  if (el.matches(".site-header")) return el.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(el);
  const box = range.getBoundingClientRect();
  return box.width ? box : el.getBoundingClientRect();
}

/**
 * Full-viewport ASCII backdrop behind the page. Fixed and non-interactive
 * (pointer-events: none); opaque panels sit above it and it fades out
 * behind loose text. It reads the pointer from the window: the field is
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
    type Box = { x: number; y: number; w: number; h: number; fixed?: boolean };
    let pageBoxes: Box[] = [];
    let doc = 0;
    let heroBox: (Box & { floor: number; soft: number }) | null = null;
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

        // Islands mount late, so rescan the text now and then. Boxes are
        // kept in page coordinates, so frames never read layout (no forced
        // reflow while Lenis scrolls); only the scroll offset changes.
        const y = window.scrollY;
        if (timeMs - lastScan > 1500) {
          lastScan = timeMs;
          doc = document.documentElement.scrollHeight;
          const els = [...document.querySelectorAll(QUIET)].filter(
            (el) => !el.closest(".spot"),
          );
          pageBoxes = [];
          for (const el of els) {
            const r = textBox(el);
            if (!r.width) continue;
            const fixed = el.matches(".site-header");
            pageBoxes.push({
              x: r.left / CELL_W,
              y: (r.top + (fixed ? 0 : y)) / CELL_H,
              w: r.width / CELL_W,
              h: r.height / CELL_H,
              fixed,
            });
          }
          const hero = document
            .querySelector(".hero-art")
            ?.getBoundingClientRect();
          heroBox = hero?.width
            ? {
                x: hero.left / CELL_W,
                y: (hero.top + y) / CELL_H,
                w: hero.width / CELL_W,
                h: hero.height / CELL_H,
                floor: 0.12,
                soft: 2,
              }
            : null;
        }
        const vh = window.innerHeight;
        const rowsScrolled = y / CELL_H;
        const viewRows = vh / CELL_H;
        const boxes: Parameters<typeof quietMask>[2][number][] = [];
        for (const b of [...pageBoxes, ...(heroBox ? [heroBox] : [])]) {
          const top = "fixed" in b && b.fixed ? b.y : b.y - rowsScrolled;
          if (top + b.h < -4 || top > viewRows + 4) continue;
          boxes.push({ ...b, y: top });
        }

        // Strong at the top and at the very bottom, calmer in between.
        const top = Math.min(1, Math.max(0, y / vh - 0.2));
        const bottom = Math.min(1, Math.max(0, 1 - (doc - y - vh) / vh));
        const intensity = Math.max(1 - 0.45 * top, bottom);

        drawField(grid, timeMs / 1000, pointer, fade, {
          intensity,
          scroll: y / CELL_H,
          quiet: quietMask(grid.cols, grid.rows, boxes),
          floor: bottom,
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

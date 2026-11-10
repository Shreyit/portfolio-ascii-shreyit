"use client";

import { useEffect, useRef } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { CanvasRenderer } from "@/components/ascii/engine/renderer";
import { scheduler } from "@/components/ascii/engine/scheduler";
import type { PointerInput } from "@/components/ascii/engine/scene";
import { ageRipples, drawField, quietMask, type Ripple } from "./field";

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
const MAX_RIPPLES = 6;

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
 * revealed softly around it, and clicking empty space sends a ripple.
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
    let ripples: Ripple[] = [];
    let quietEls: Element[] = [];
    // Re-queried on each scan: the hero swaps its static figure for a canvas.
    let heroEl: Element | null = null;
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
        maxDpr: 1.5,
      });
      renderer = next;
      await next.init(w, h);
      if (disposed) next.destroy();
    };

    const toCells = (clientX: number, clientY: number) => ({
      x: clientX / CELL_W,
      y: clientY / CELL_H,
    });
    const addRipple = (x: number, y: number, power: number) => {
      ripples.push({ x, y, age: 0, power });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    };

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
    const onDown = (event: PointerEvent) => {
      const el = event.target as Element | null;
      if (el?.closest("a, button, input, textarea, select, .spot")) return;
      const c = toCells(event.clientX, event.clientY);
      addRipple(c.x, c.y, 1);
    };
    const onLeave = () => {
      target.active = false;
    };

    void build();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
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
        ripples = ageRipples(ripples, dtMs / 1000);

        // Islands mount late, so rescan the text elements now and then.
        if (timeMs - lastScan > 1500) {
          lastScan = timeMs;
          heroEl = document.querySelector(".hero-art");
          quietEls = [...document.querySelectorAll(QUIET)].filter(
            (el) => !el.closest(".spot"),
          );
        }
        const vh = window.innerHeight;
        const boxes: Parameters<typeof quietMask>[2][number][] = [];
        // A wide, soft oval hush behind the hero name (no hard box).
        const hero = heroEl?.getBoundingClientRect();
        if (hero && hero.bottom > 0) {
          boxes.push({
            x: hero.left / CELL_W,
            y: hero.top / CELL_H,
            w: hero.width / CELL_W,
            h: hero.height / CELL_H,
            floor: 0.12,
            soft: 2,
          });
        }
        for (const el of quietEls) {
          const r = textBox(el);
          if (r.bottom < 0 || r.top > vh || !r.width) continue;
          boxes.push({
            x: r.left / CELL_W,
            y: r.top / CELL_H,
            w: r.width / CELL_W,
            h: r.height / CELL_H,
          });
        }

        // Strong at the top and at the very bottom, calmer in between.
        const y = window.scrollY;
        const doc = document.documentElement.scrollHeight;
        const top = Math.min(1, Math.max(0, y / vh - 0.2));
        const bottom = Math.min(1, Math.max(0, 1 - (doc - y - vh) / vh));
        const intensity = Math.max(1 - 0.45 * top, bottom);

        drawField(grid, timeMs / 1000, pointer, fade, {
          intensity,
          scroll: y / CELL_H,
          quiet: quietMask(grid.cols, grid.rows, boxes),
          floor: bottom,
          ripples,
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
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="ambient-field" aria-hidden="true" />
  );
}

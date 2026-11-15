"use client";

import { useEffect, useRef } from "react";
import { scheduler } from "@/components/ascii/engine/scheduler";

/**
 * Full-viewport glyph field behind the page, ported from AakaarIO's
 * builder (useGlyphField): monospace glyphs that shimmer and light up in a
 * soft spotlight easing after the cursor, or drifting on a slow Lissajous
 * path when nobody is hovering. Every glyph's alpha is continuous (no
 * palette steps) and the spotlight moves in sub-pixel steps, with a CSS
 * haze glow under it, so it glides instead of stepping cell to cell.
 *
 * Fixed and non-interactive (pointer-events: none): it reads the pointer
 * from the window. It stays calmer under the central reading column and
 * dark behind the focal art (name, portrait).
 */

const GLYPHS = "#$%&@*+=<>/\\{}[]();:~?!8B0#%&@$";
const CELL_W = 16;
const CELL_H = 21;

/** Visibility outside the spotlight. */
const BASE_ALPHA = 0.05;
/** Spotlight radius (px) while drifting / while hovering. */
const IDLE_RADIUS = 200;
const ACTIVE_RADIUS = 260;
/** Brightness of the spotlight core / its wide halo. */
const HOT_ALPHA = 0.6;
const WIDE_ALPHA = 0.2;
/** Share of the gap to the cursor closed per 30fps frame (lower = smoother). */
const FOLLOW = 0.07;

type Rgb = [number, number, number];

function parseColor(str: string, fallback: Rgb): Rgb {
  const s = str.trim();
  let m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return [+m[1]!, +m[2]!, +m[3]!];
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return fallback;
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const smooth = (e0: number, e1: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};

export default function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hazeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const haze = hazeRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !haze || !ctx) return;

    const font = `600 13px ${getComputedStyle(canvas).fontFamily || "ui-monospace, monospace"}`;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let grid: string[] = [];
    let calm = new Float32Array(0);
    let colors: { deep: Rgb; main: Rgb; light: Rgb } = {
      deep: [106, 79, 216],
      main: [185, 162, 255],
      light: [240, 143, 138],
    };
    let shades: { x: number; y: number; rx: number; ry: number }[] = [];
    let lastScan = -Infinity;

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors = {
        deep: parseColor(cs.getPropertyValue("--spectrum-1"), colors.deep),
        main: parseColor(cs.getPropertyValue("--accent"), colors.main),
        light: parseColor(cs.getPropertyValue("--spectrum-4"), colors.light),
      };
    };
    const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL_W) + 1;
      rows = Math.ceil(h / CELL_H) + 1;
      grid = Array.from({ length: cols * rows }, randGlyph);
      // Calmer under the reading column, fuller toward the sides.
      calm = new Float32Array(cols);
      for (let c = 0; c < cols; c += 1) {
        const d = Math.abs(((c + 0.5) * CELL_W) / w - 0.5) * 2;
        calm[c] = 0.55 + 0.45 * smooth(0.1, 1, d);
      }
    };

    const pointer = { x: 0, y: 0, active: false };
    const spot = { x: 0, y: 0, r: IDLE_RADIUS };

    const scanShades = () => {
      shades = [];
      for (const el of document.querySelectorAll(".hero-art, .portrait-art")) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        shades.push({
          x: r.left + r.width / 2,
          y: r.top + window.scrollY + r.height / 2,
          rx: r.width / 1.05,
          ry: r.height / 1.1,
        });
      }
    };

    const draw = (t: number, dtMs: number) => {
      const tx = pointer.active
        ? pointer.x
        : w * (0.5 + 0.34 * Math.sin(t * 0.00031));
      const ty = pointer.active
        ? pointer.y
        : h * (0.42 + 0.18 * Math.sin(t * 0.00053 + 1.3));
      // Frame-rate independent easing: the same glide at any fps.
      const steps = dtMs / 33;
      const k = 1 - Math.pow(1 - FOLLOW, steps);
      const kr = 1 - Math.pow(1 - FOLLOW * 0.75, steps);
      spot.x += (tx - spot.x) * k;
      spot.y += (ty - spot.y) * k;
      spot.r += ((pointer.active ? ACTIVE_RADIUS : IDLE_RADIUS) - spot.r) * kr;

      const n = Math.max(1, (grid.length * 0.012 * Math.min(3, steps)) | 0);
      for (let i = 0; i < n; i += 1) {
        grid[(Math.random() * grid.length) | 0] = randGlyph();
      }

      const sy = window.scrollY;
      ctx.clearRect(0, 0, w, h);
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const R1 = spot.r * spot.r;
      const R2 = spot.r * 2.6 * (spot.r * 2.6);
      for (let row = 0; row < rows; row += 1) {
        const cy = row * CELL_H + CELL_H / 2;
        for (let col = 0; col < cols; col += 1) {
          const cx = col * CELL_W + CELL_W / 2;
          const dx = cx - spot.x;
          const dy = cy - spot.y;
          const d2 = dx * dx + dy * dy;
          const hot = Math.exp(-d2 / R1);
          const wide = Math.exp(-d2 / R2);
          let alpha =
            (BASE_ALPHA + WIDE_ALPHA * wide + HOT_ALPHA * hot) * calm[col]!;
          for (const s of shades) {
            const ex = (cx - s.x) / s.rx;
            const ey = (cy - (s.y - sy)) / s.ry;
            alpha *= 1 - 0.9 * Math.exp(-(ex * ex + ey * ey));
          }
          if (alpha < 0.03) continue;
          let rgb = mix(colors.deep, colors.main, Math.min(1, wide * 1.2));
          if (hot > 0.35) rgb = mix(rgb, colors.light, (hot - 0.35) / 0.65);
          ctx.fillStyle = `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${Math.min(1, alpha).toFixed(3)})`;
          ctx.fillText(grid[row * cols + col]!, cx, cy);
        }
      }
      haze.style.setProperty("--fx", `${spot.x.toFixed(1)}px`);
      haze.style.setProperty("--fy", `${spot.y.toFixed(1)}px`);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        lastScan = -Infinity;
      }, 150);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      // No spotlight behind the focal art: it would light up through it.
      pointer.active = !(event.target as Element | null)?.closest?.(
        ".hero-art, .portrait-art",
      );
    };
    const onLeave = () => {
      pointer.active = false;
    };

    resize();
    readColors();
    spot.x = w / 2;
    spot.y = h * 0.42;

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    let frame = 0;
    const handle = scheduler.register({
      fps: 30,
      update(timeMs, dtMs) {
        if (frame++ % 30 === 0) readColors();
        if (timeMs - lastScan > 1500) {
          lastScan = timeMs;
          scanShades();
        }
        draw(timeMs, dtMs);
      },
    });

    return () => {
      handle.dispose();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="ambient-field" aria-hidden="true">
      <div ref={hazeRef} className="ambient-haze" />
      <canvas ref={canvasRef} className="ambient-canvas" />
    </div>
  );
}

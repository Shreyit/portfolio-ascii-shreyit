import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";
import portrait from "@/content/generated/portrait.json";

// A braille portrait (each character is a 2×4 grid of dots), imported from
// an image-to-ASCII converter by scripts/build-portrait.mjs.
const LINES: readonly string[] = portrait.lines;
export const PORTRAIT_COLS: number = portrait.cols;
export const PORTRAIT_ROWS: number = portrait.rows;
const BLANK = 0x2800;

interface Particle {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ch: string;
  /** Dots lit in this cell, 0..1. */
  ink: number;
  seed: number;
}

const CELL_ASPECT = 2;
const RADIUS = 9; // pointer influence, in columns
const SPRING = 16;
const DAMPING = 6;

function popcount(n: number): number {
  let c = 0;
  for (; n; n &= n - 1) c += 1;
  return c;
}

/** Every non-blank braille cell with its home position. */
export function portraitCells(): { x: number; y: number; ch: string }[] {
  const cells: { x: number; y: number; ch: string }[] = [];
  LINES.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch.codePointAt(0) !== BLANK) cells.push({ x, y, ch });
    });
  });
  return cells;
}

/**
 * Hue runs top (violet) to bottom (orchid); denser cells are brighter. A
 * gentle vertical ramp lifts the top (the face) and settles the bottom.
 */
function colourFor(p: Particle, glow: number): number {
  const v = p.hy / PORTRAIT_ROWS;
  const hue = 0.3 + v * 0.35;
  const level = 0.72 + p.ink * 0.28 + (0.45 - v) * 0.4 + glow;
  return spectrum(Math.min(1, hue + glow * 0.4), Math.min(1, level));
}

/**
 * The portrait as springy braille cells: the pointer pushes them aside and
 * warms them, they settle home, and a click scatters the whole picture. On
 * load it reveals top to bottom.
 */
export function createPortraitScene(
  options: { intro?: boolean } = {},
): AsciiScene & { burst(): void } {
  const particles: Particle[] = portraitCells().map((c, i) => ({
    hx: c.x,
    hy: c.y,
    x: c.x,
    y: c.y,
    vx: 0,
    vy: 0,
    ch: c.ch,
    ink: popcount(c.ch.codePointAt(0)! - BLANK) / 8,
    seed: (i * 7919) % 97,
  }));
  let burst = false;
  let introStart = options.intro ? -1 : -Infinity;
  const pointer = { x: 0, y: 0, active: false };

  const draw = (grid: AsciiGrid, t: number) => {
    grid.fill(" ", 1);
    const intro = introStart === -1 ? 0 : t - introStart;
    for (const p of particles) {
      if (intro < (p.hy / PORTRAIT_ROWS) * 1.2 + (p.seed % 7) * 0.02) continue;
      let glow = 0;
      if (pointer.active) {
        const d2 =
          (p.hx - pointer.x) ** 2 + ((p.hy - pointer.y) * CELL_ASPECT) ** 2;
        glow = Math.exp(-d2 / 160) * 0.45;
      }
      const moving = Math.hypot(p.vx, p.vy) > 3;
      grid.set(
        Math.round(p.x),
        Math.round(p.y),
        p.ch,
        moving ? spectrum(0.85, 0.95) : colourFor(p, glow),
      );
    }
  };

  return {
    burst() {
      burst = true;
    },
    init(grid) {
      draw(grid, 0);
    },
    update(grid, timeMs, dtMs, input: PointerInput) {
      if (introStart === -1) introStart = timeMs / 1000;
      pointer.x = input.x;
      pointer.y = input.y;
      pointer.active = input.active;
      const dt = Math.min(0.05, dtMs / 1000);
      const cx = PORTRAIT_COLS / 2;
      const cy = PORTRAIT_ROWS / 2;
      for (const p of particles) {
        if (burst) {
          const a = Math.atan2((p.hy - cy) * CELL_ASPECT, p.hx - cx);
          const force = 35 + ((p.seed * 13) % 35);
          p.vx += Math.cos(a) * force;
          p.vy += (Math.sin(a) * force) / CELL_ASPECT;
        }
        if (input.active) {
          const dx = p.x - input.x;
          const dy = (p.y - input.y) * CELL_ASPECT;
          const d2 = dx * dx + dy * dy;
          if (d2 < RADIUS * RADIUS && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const push = ((RADIUS - d) / RADIUS) * 70;
            p.vx += (dx / d) * push * dt;
            p.vy += ((dy / d) * push * dt) / CELL_ASPECT;
          }
        }
        p.vx += ((p.hx - p.x) * SPRING - p.vx * DAMPING) * dt;
        p.vy += ((p.hy - p.y) * SPRING - p.vy * DAMPING) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      burst = false;
      draw(grid, timeMs / 1000);
    },
    staticFrame(grid) {
      for (const p of particles) grid.set(p.hx, p.hy, p.ch, colourFor(p, 0));
    },
  };
}

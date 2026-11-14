import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { EXTRA_BASE, spectrum } from "@/components/ascii/engine/palette";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";
import portrait from "@/content/generated/portrait.json";

// An ASCII portrait imported from an image-to-ASCII converter's HTML export
// by scripts/build-portrait-ascii.mjs: its characters as drawn, each in the
// photo's natural colour (an index into a small palette, one key character
// per cell). The renderer carries that palette as `extraColors`.
const LINES: readonly string[] = portrait.lines;
const TINTS: readonly string[] = portrait.tints;
export const PORTRAIT_COLOURS: readonly string[] = portrait.palette;
export const PORTRAIT_COLS: number = portrait.cols;
export const PORTRAIT_ROWS: number = portrait.rows;

/** One character per palette index. */
const TINT_KEY =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

interface Particle {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ch: string;
  /** Palette index of the photo's colour here. */
  tint: number;
  seed: number;
}

const CELL_ASPECT = 2;
const RADIUS = 9; // pointer influence, in columns
const SPRING = 16;
const DAMPING = 6;

/** Every non-blank cell with its home position and colour. */
export function portraitCells(): {
  x: number;
  y: number;
  ch: string;
  tint: number;
}[] {
  const cells: { x: number; y: number; ch: string; tint: number }[] = [];
  LINES.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch === " ") return;
      cells.push({
        x,
        y,
        ch,
        tint: Math.max(0, TINT_KEY.indexOf(TINTS[y]?.[x] ?? "0")),
      });
    });
  });
  return cells;
}

/**
 * The portrait as springy ASCII cells: the pointer pushes them aside and
 * warms them, they settle home, and a click scatters the whole picture. On
 * load it reveals top to bottom.
 */
export function createPortraitScene(
  options: {
    intro?: boolean;
  } = {},
): AsciiScene & { burst(): void } {
  const particles: Particle[] = portraitCells().map((c, i) => ({
    hx: c.x,
    hy: c.y,
    x: c.x,
    y: c.y,
    vx: 0,
    vy: 0,
    ch: c.ch,
    tint: c.tint,
    seed: (i * 7919) % 97,
  }));
  let burst = false;
  let introStart = options.intro ? -1 : -Infinity;

  const draw = (grid: AsciiGrid, t: number) => {
    grid.fill(" ", 1);
    const intro = introStart === -1 ? 0 : t - introStart;
    for (const p of particles) {
      if (intro < (p.hy / PORTRAIT_ROWS) * 1.2 + (p.seed % 7) * 0.02) continue;
      const moving = Math.hypot(p.vx, p.vy) > 3;
      grid.set(
        Math.round(p.x),
        Math.round(p.y),
        p.ch,
        moving ? spectrum(0.85, 0.95) : EXTRA_BASE + p.tint,
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
      for (const p of particles)
        grid.set(p.hx, p.hy, p.ch, EXTRA_BASE + p.tint);
    },
  };
}

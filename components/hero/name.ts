import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";
import nameMask from "@/content/generated/name-mask.json";

// Ink coverage per cell (0-9), rendered from a heavy typeface by
// scripts/build-name-mask.mjs. Cells are twice as tall as wide.
const MASK: readonly string[] = nameMask.mask;
export const NAME_COLS: number = nameMask.cols;
export const NAME_ROWS: number = nameMask.rows;
/** Coverage at or above which a cell is part of the name. */
const INK = 2;

/** Home cells of every ink cell of the name, with coverage 0..1. */
export function nameCells(): { x: number; y: number; c: number }[] {
  const cells: { x: number; y: number; c: number }[] = [];
  MASK.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const v = row.charCodeAt(x) - 48;
      if (v >= INK) cells.push({ x, y, c: v / 9 });
    }
  });
  return cells;
}

/** Light glyphs for the soft, anti-aliased edges of each letter. */
const EDGE = ".:-=+*";
/** Dense glyphs for the letter bodies; they slowly cycle. */
const BODY = "#$@%&8BWM0X#";
const MOVING = ".:-=+*";
const SCRAMBLE = "!<>-_\\/[]{}=+*^?#%&@$";
/** Seconds for the intro sweep to cross the name. */
const INTRO_SWEEP = 1.1;

interface Particle {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: number;
  seed: number;
}

const CELL_ASPECT = 2;
const RADIUS = 8; // pointer influence, in columns
const SPRING = 14;
const DAMPING = 5.5;

function glyphFor(p: Particle, t: number): string {
  if (p.c < 0.55) {
    return EDGE[
      Math.min(EDGE.length - 1, Math.floor((p.c / 0.55) * EDGE.length))
    ]!;
  }
  // Each body cell steps through the dense set at its own pace.
  const step = Math.floor(t * (0.6 + (p.seed % 7) * 0.15) + p.seed);
  return BODY[step % BODY.length]!;
}

/** Hue sweeps left → right across the name and drifts over time. */
function colourFor(p: Particle, t: number, boost: number): number {
  const hue = (p.hx / NAME_COLS) * 0.85 + 0.08 * Math.sin(t * 0.5 + p.hy * 0.3);
  const wave = Math.sin(p.hx * 0.09 - t * 1.4 + p.hy * 0.25);
  const level = 0.58 + p.c * 0.35 + (wave > 0.85 ? 0.2 : 0) + boost;
  return spectrum(Math.min(1, Math.max(0, hue)), Math.min(0.999, level));
}

/**
 * The name as physically simulated characters: on load a decode sweep
 * scrambles them into place; the pointer pushes them away, springs pull them home,
 * and a click scatters them. Edges are drawn with light glyphs and bodies
 * with dense, slowly cycling ones, coloured along the spectrum.
 */
export function createNameScene(
  options: { intro?: boolean } = {},
): AsciiScene & { burst(): void } {
  const particles: Particle[] = nameCells().map((cell, i) => ({
    hx: cell.x,
    hy: cell.y,
    x: cell.x,
    y: cell.y,
    vx: 0,
    vy: 0,
    c: cell.c,
    seed: (i * 7919) % 97,
  }));
  let burst = false;
  // Intro: a decode sweep runs left to right, scrambling each cell through
  // random glyphs in warm colours before it settles.
  let introStart = options.intro ? -1 : -Infinity;

  const draw = (grid: AsciiGrid, t: number) => {
    grid.fill(" ", 1);
    const intro = introStart === -1 ? 0 : t - introStart;
    for (const p of particles) {
      const speed = Math.hypot(p.vx, p.vy);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const settle = (p.hx / NAME_COLS) * INTRO_SWEEP + (p.seed % 9) * 0.03;
      if (intro < settle) {
        const ahead = settle - intro;
        if (ahead < 0.35) {
          const ch = SCRAMBLE[(p.seed + Math.floor(t * 30)) % SCRAMBLE.length]!;
          grid.set(x, y, ch, spectrum(0.75 + ahead * 0.6, 0.999));
        }
        continue;
      }
      if (speed > 1.5) {
        const i = Math.min(MOVING.length - 1, Math.floor(speed / 6));
        const hue = Math.min(1, 0.55 + speed / 80);
        grid.set(x, y, MOVING[MOVING.length - 1 - i]!, spectrum(hue, 0.9));
      } else {
        grid.set(x, y, glyphFor(p, t), colourFor(p, t, 0));
      }
    }
  };

  return {
    burst() {
      burst = true;
    },
    init(grid) {
      draw(grid, 0);
    },
    update(grid, timeMs, dtMs, pointer: PointerInput) {
      if (introStart === -1) introStart = timeMs / 1000;
      const dt = Math.min(0.05, dtMs / 1000);
      const cx = NAME_COLS / 2;
      const cy = NAME_ROWS / 2;
      for (const p of particles) {
        if (burst) {
          const a = Math.atan2((p.hy - cy) * CELL_ASPECT, p.hx - cx);
          const force = 40 + ((p.seed * 13) % 40);
          p.vx += Math.cos(a) * force;
          p.vy += (Math.sin(a) * force) / CELL_ASPECT;
        }
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = (p.y - pointer.y) * CELL_ASPECT;
          const d2 = dx * dx + dy * dy;
          if (d2 < RADIUS * RADIUS && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const push = ((RADIUS - d) / RADIUS) * 160;
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
        grid.set(p.hx, p.hy, glyphFor(p, 0), colourFor(p, 0, 0));
    },
  };
}

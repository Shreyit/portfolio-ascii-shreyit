import type { AsciiGrid } from "@/components/ascii/engine/grid";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";

// A 5x7 block font, only the letters the name needs. Each "#" becomes two
// grid columns, since character cells are about twice as tall as wide.
const FONT: Record<string, string[]> = {
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  I: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
};

const LINES = ["SHREYIT", "SINHA"];
const GLYPH_ROWS = 7;
const PIXEL_W = 2; // grid columns per font pixel
const LETTER_GAP = 2; // columns between letters
const LINE_GAP = 2; // rows between lines
const MARGIN_X = 2;
const MARGIN_Y = 1;

const letterWidth = 5 * PIXEL_W;
const lineWidth = (text: string) =>
  text.length * letterWidth + (text.length - 1) * LETTER_GAP;

export const NAME_COLS = Math.max(...LINES.map(lineWidth)) + MARGIN_X * 2;
export const NAME_ROWS =
  LINES.length * GLYPH_ROWS + (LINES.length - 1) * LINE_GAP + MARGIN_Y * 2;

/** Home cells of every "ink" cell of the name, centred line by line. */
export function nameCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  LINES.forEach((line, li) => {
    const x0 = Math.floor((NAME_COLS - lineWidth(line)) / 2);
    const y0 = MARGIN_Y + li * (GLYPH_ROWS + LINE_GAP);
    [...line].forEach((ch, ci) => {
      const glyph = FONT[ch]!;
      glyph.forEach((row, ry) => {
        [...row].forEach((px, rx) => {
          if (px !== "#") return;
          for (let k = 0; k < PIXEL_W; k += 1) {
            cells.push({
              x: x0 + ci * (letterWidth + LETTER_GAP) + rx * PIXEL_W + k,
              y: y0 + ry,
            });
          }
        });
      });
    });
  });
  return cells;
}

// Palette indices (engine/palette.ts).
const FG = 0;
const MUTED = 1;
const ACCENT = 2;

const REST = "#";
const SHIMMER = "#%@&8$";
const MOVING = ".:-=+*";

interface Particle {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  seed: number;
}

const CELL_ASPECT = 2;
const RADIUS = 7; // pointer influence, in columns
const SPRING = 14;
const DAMPING = 5.5;

/**
 * The name, built from characters that are physically simulated: the
 * pointer pushes them away, springs pull them home, and a click scatters
 * them. Resting characters shimmer gently; moving ones thin out.
 */
export function createNameScene(): AsciiScene & { burst(): void } {
  const particles: Particle[] = nameCells().map((c, i) => ({
    hx: c.x,
    hy: c.y,
    x: c.x,
    y: c.y,
    vx: 0,
    vy: 0,
    seed: (i * 7919) % 97,
  }));
  let burst = false;

  const draw = (grid: AsciiGrid, t: number) => {
    grid.fill(" ", MUTED);
    for (const p of particles) {
      const speed = Math.hypot(p.vx, p.vy);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (speed > 1.5) {
        const i = Math.min(MOVING.length - 1, Math.floor(speed / 6));
        grid.set(x, y, MOVING[MOVING.length - 1 - i]!, ACCENT);
      } else {
        // Slow travelling shimmer across the letters.
        const wave = Math.sin(p.hx * 0.18 - t * 1.6 + p.hy * 0.4);
        const ch =
          wave > 0.93
            ? SHIMMER[(p.seed + Math.floor(t * 4)) % SHIMMER.length]!
            : REST;
        grid.set(x, y, ch, wave > 0.93 ? ACCENT : FG);
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
      for (const p of particles) grid.set(p.hx, p.hy, REST, FG);
    },
  };
}

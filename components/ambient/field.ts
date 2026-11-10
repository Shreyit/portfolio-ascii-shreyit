import type { AsciiGrid } from "@/components/ascii/engine/grid";
import type { PointerInput } from "@/components/ascii/engine/scene";

// Palette indices (engine/palette.ts).
const MUTED = 1;
const ACCENT = 2;
const BORDER = 3;

/** Far from the pointer the field is a faint, sparse dust. */
const DUST = " ..:";
/** Around the pointer it is revealed as dense ASCII, densest at the centre. */
const RAMP = " .:-=+*#%@";
const CELL_ASPECT = 2;
/** Radius (in columns) of the spotlight that reveals the field. */
export const REVEAL_RADIUS = 13;

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * A drifting character field. Away from the pointer it is a faint dust in the
 * border colour; inside a spotlight around the pointer it is revealed as
 * dense ASCII in the accent colour, fading through muted at the edge. `fade`
 * (0..1) eases the spotlight in and out.
 */
export function drawField(
  grid: AsciiGrid,
  t: number,
  pointer: PointerInput,
  fade: number,
): void {
  const { cols, rows } = grid;
  const r2 = REVEAL_RADIUS * REVEAL_RADIUS;
  const minY = Math.floor(pointer.y - REVEAL_RADIUS / CELL_ASPECT) - 1;
  const maxY = Math.ceil(pointer.y + REVEAL_RADIUS / CELL_ASPECT) + 1;
  for (let y = 0; y < rows; y += 1) {
    const inBand = fade > 0 && y >= minY && y <= maxY;
    for (let x = 0; x < cols; x += 1) {
      const v = noise(x * 0.07 + t * 0.05, y * 0.14 - t * 0.03);

      // Spotlight: 1 at the pointer, 0 at the rim.
      let s = 0;
      if (inBand) {
        const dx = x - pointer.x;
        const dy = (y - pointer.y) * CELL_ASPECT;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const k = 1 - Math.sqrt(d2) / REVEAL_RADIUS;
          s = fade * k * k * (3 - 2 * k);
        }
      }

      if (s > 0.04) {
        // Ripple ties the revealed glyphs to the same drifting noise.
        const ripple = 0.5 + 0.5 * Math.sin(v * 9 + t * 2.2);
        const level = s * (0.45 + 0.55 * ripple);
        const i = Math.min(RAMP.length - 1, Math.floor(level * RAMP.length));
        if (i > 0) {
          grid.set(x, y, RAMP[i]!, s > 0.35 ? ACCENT : MUTED);
          continue;
        }
      }

      // Dust: a sparse checkerboard, so it never competes with text.
      const dust = (v - 0.45) / 0.55;
      if ((x + y) % 2 || dust <= 0) {
        grid.set(x, y, " ", BORDER);
        continue;
      }
      const i = Math.min(DUST.length - 1, Math.floor(dust * DUST.length));
      grid.set(x, y, DUST[i]!, BORDER);
    }
  }
}

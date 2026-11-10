import type { AsciiGrid } from "@/components/ascii/engine/grid";
import type { PointerInput } from "@/components/ascii/engine/scene";

// Palette index (engine/palette.ts).
const BORDER = 3;

const GLYPHS = " ..:"; // kept faint: it must never compete with text
const CELL_ASPECT = 2;
/** Radius (in columns) around the pointer where the field fades out. */
export const CLEAR_RADIUS = 11;

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
 * A faint, slowly drifting character field. Cells near the pointer fade to
 * blank, so the field "parts" around the cursor. `fade` (0..1) eases that
 * clearing in and out.
 */
export function drawField(
  grid: AsciiGrid,
  t: number,
  pointer: PointerInput,
  fade: number,
): void {
  const { cols, rows } = grid;
  const r2 = CLEAR_RADIUS * CLEAR_RADIUS;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      // Sparse: only a checkerboard of cells can ever show a glyph.
      if ((x + y) % 2) {
        grid.set(x, y, " ", BORDER);
        continue;
      }
      let v = noise(x * 0.07 + t * 0.05, y * 0.14 - t * 0.03);
      v = (v - 0.45) / 0.55;
      if (fade > 0) {
        const dx = x - pointer.x;
        const dy = (y - pointer.y) * CELL_ASPECT;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) v -= fade * (1 - d2 / r2) * 1.2;
      }
      if (v <= 0) {
        grid.set(x, y, " ", BORDER);
        continue;
      }
      const i = Math.min(GLYPHS.length - 1, Math.floor(v * GLYPHS.length));
      grid.set(x, y, GLYPHS[i]!, BORDER);
    }
  }
}

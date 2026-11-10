import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { PointerInput } from "@/components/ascii/engine/scene";

/** Mostly '#', salted with the rest of the printable set. */
const GLYPHS = "########$%&*+=-:;~<>(){}[]|/\\@8BX0S?!^";
/** Denser glyphs used inside the pointer spotlight. */
const HOT = "@#%&8B$";
const CELL_ASPECT = 2; // row height / column width
/** Radius (in columns) of the spotlight that brightens the field. */
export const REVEAL_RADIUS = 24;

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

const smooth = (e0: number, e1: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};

export interface FieldOptions {
  /** Overall brightness 0..1 (the page dims it as you scroll down). */
  intensity: number;
  /** Rows scrolled, for a slow parallax drift. */
  scroll: number;
  /** A box (grid cells) the field stays quiet behind, e.g. the hero name. */
  calm?: { x: number; y: number; w: number; h: number } | null;
}

/**
 * An aurora of characters: domain-warped noise forms soft blobs whose hue
 * drifts through the spectrum (indigo → violet → orchid → coral → amber)
 * and whose brightness fades smoothly into the background. Around the
 * pointer the field brightens, warms and densifies. `fade` (0..1) eases the
 * spotlight in and out.
 */
export function drawField(
  grid: AsciiGrid,
  t: number,
  pointer: PointerInput,
  fade: number,
  options: FieldOptions = { intensity: 1, scroll: 0 },
): void {
  const { cols, rows } = grid;
  const r2 = REVEAL_RADIUS * REVEAL_RADIUS;
  const flicker = Math.floor(t * 0.7);
  const calm = options.calm;
  for (let y = 0; y < rows; y += 1) {
    const fy = y + options.scroll * 0.35;
    for (let x = 0; x < cols; x += 1) {
      // Only every other column carries a glyph: airy, evenly spaced type.
      if (x % 2) {
        grid.set(x, y, " ", 3);
        continue;
      }
      // Domain warp gives the blobs their smeared, smoky edges.
      // Noise runs in a scaled space so blob size is independent of the
      // (small) cell size.
      const nx = x * 0.62;
      const ny = fy * 0.7;
      const wx = noise(nx * 0.02 + t * 0.03, ny * 0.04) * 3;
      const wy = noise(nx * 0.02 - 7.3, ny * 0.04 + t * 0.02) * 3;
      const n =
        noise(nx * 0.035 + wx, ny * 0.07 + wy - t * 0.04) * 0.7 +
        noise(nx * 0.09 - t * 0.05, ny * 0.18) * 0.3;
      // Blobs lean to the right, away from the text column.
      const lean = 0.55 + 0.45 * (x / cols);
      let level = smooth(0.4, 0.85, n) * lean * options.intensity * 0.92;
      if (calm) {
        // Soft elliptical hush behind the calm box.
        const qx = (x - (calm.x + calm.w / 2)) / (calm.w / 2 + 6);
        const qy = (y - (calm.y + calm.h / 2)) / (calm.h / 2 + 3);
        level *= 0.15 + 0.85 * smooth(0.75, 1.25, Math.hypot(qx, qy));
      }
      let hue = noise(nx * 0.012 + 3.1, ny * 0.02 - t * 0.015) * 1.15 - 0.05;

      let s = 0;
      if (fade > 0) {
        const dx = x - pointer.x;
        const dy = (y - pointer.y) * CELL_ASPECT;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const k = 1 - Math.sqrt(d2) / REVEAL_RADIUS;
          s = fade * k * k * (3 - 2 * k);
          level = Math.max(level, s * 0.95) + s * 0.25;
          hue += s * 0.35;
        }
      }

      if (level < 0.06) {
        grid.set(x, y, " ", 3);
        continue;
      }
      const h = hash(x, y);
      // Each cell keeps its glyph and occasionally flips to another.
      const flip = hash(x * 3 + flicker, y) < 0.04 ? flicker : 0;
      const pool = s > 0.45 ? HOT : GLYPHS;
      const char = pool[Math.floor(hash(x + flip, y - flip) * pool.length)]!;
      grid.set(
        x,
        y,
        char,
        spectrum(
          Math.min(1, Math.max(0, hue)),
          Math.min(0.999, level + h * 0.08),
        ),
      );
    }
  }
}

import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { PointerInput } from "@/components/ascii/engine/scene";

/** Mostly '#', salted with the rest of the printable set. */
const GLYPHS = "#####$%&*+=-:;~<>(){}[]|/\\@8BX0S?!^";
/** Denser glyphs around the pointer. */
const HOT = "@#%&8B$";
const CELL_ASPECT = 2; // row height / column width
/** Radius (columns) of the soft swell that follows the pointer. */
export const SWELL_RADIUS = 26;

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
  /** Overall brightness 0..1. */
  intensity: number;
  /** Rows scrolled, for a slow parallax drift. */
  scroll: number;
  /**
   * A soft Gaussian shadow (centre and radii in cells) that darkens the
   * field behind a focal element, e.g. the hero name. No edges: it falls
   * off continuously.
   */
  shade?: { x: number; y: number; rx: number; ry: number } | null;
}

/**
 * An evenly woven field of characters. Every other column carries a glyph;
 * brightness comes from large, domain-warped noise so it blends smoothly
 * from near-black into soft clouds whose hue drifts through the spectrum.
 * The pointer gently swells the field around it (`fade` eases that in and
 * out), and it stays calmer under the central reading column.
 */
export function drawField(
  grid: AsciiGrid,
  t: number,
  pointer: PointerInput,
  fade: number,
  options: FieldOptions = { intensity: 1, scroll: 0 },
): void {
  const { cols, rows } = grid;
  const flicker = Math.floor(t * 0.7);
  const calm = new Float32Array(cols);
  for (let x = 0; x < cols; x += 1) {
    const d = Math.abs(x / cols - 0.5) * 2; // 0 centre … 1 edge
    calm[x] = 0.6 + 0.4 * smooth(0.1, 1, d);
  }
  const swell2 = SWELL_RADIUS * SWELL_RADIUS;
  for (let y = 0; y < rows; y += 1) {
    const fy = y + options.scroll * 0.35;
    for (let x = 0; x < cols; x += 1) {
      if (x % 2) {
        grid.set(x, y, " ", 3);
        continue;
      }
      // Large, slow, warped noise: soft clouds rather than spots.
      const nx = x * 0.5;
      const ny = fy * 0.55;
      const wx = noise(nx * 0.02 + t * 0.02, ny * 0.04) * 2.2;
      const wy = noise(nx * 0.02 - 7.3, ny * 0.04 + t * 0.015) * 2.2;
      const n =
        noise(nx * 0.036 + wx, ny * 0.072 + wy - t * 0.03) * 0.8 +
        noise(nx * 0.09 - t * 0.04, ny * 0.18) * 0.2;
      // Soft clouds: long gradients from near-black into bright cores.
      const cloud = smooth(0.3, 0.88, n);
      let level = 0.08 + Math.pow(cloud, 1.25) * 0.92;
      let hue = noise(nx * 0.008 + 3.1, ny * 0.016 - t * 0.012) * 1.2 - 0.1;
      let hot = 0;

      if (fade > 0) {
        const dx = x - pointer.x;
        const dy = (y - pointer.y) * CELL_ASPECT;
        const d2 = dx * dx + dy * dy;
        if (d2 < swell2) {
          // Gaussian reveal, no hard rim: brighter, warmer and denser
          // glyphs that blend back into the field.
          const g = Math.exp((-3.2 * d2) / swell2) * fade;
          level = level * (1 + g * 1.5) + g * 0.75;
          hue += g * 0.3;
          hot = Math.max(hot, g);
        }
      }

      // One wide horizontal gradient: calmer under the reading column,
      // stronger towards the sides. No shapes, so no edges anywhere.
      level *= options.intensity * calm[x]!;
      if (options.shade) {
        const sx = (x - options.shade.x) / options.shade.rx;
        const sy = (y - options.shade.y) / options.shade.ry;
        level *= 1 - 0.85 * Math.exp(-(sx * sx + sy * sy));
      }

      const h = hash(x, y);
      // Proportional dither: hides banding without speckling dark areas.
      const shade = Math.min(1, Math.max(0, level * (1 + (h - 0.5) * 0.3)));
      if (shade < 0.012) {
        grid.set(x, y, " ", 3);
        continue;
      }
      const flip = hash(x * 3 + flicker, y) < 0.04 ? flicker : 0;
      const pool = hot > 0.35 ? HOT : GLYPHS;
      const char = pool[Math.floor(hash(x + flip, y - flip) * pool.length)]!;
      grid.set(x, y, char, spectrum(Math.min(1, Math.max(0, hue)), shade));
    }
  }
}

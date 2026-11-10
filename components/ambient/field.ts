import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { PointerInput } from "@/components/ascii/engine/scene";

/** Mostly '#', salted with the rest of the printable set. */
const GLYPHS = "#####$%&*+=-:;~<>(){}[]|/\\@8BX0S?!^";
/** Denser glyphs around the pointer and where a ripple passes. */
const HOT = "@#%&8B$";
const CELL_ASPECT = 2; // row height / column width
/** Radius (columns) of the soft swell that follows the pointer. */
export const SWELL_RADIUS = 26;
/** Ripple speed (columns per second) and lifetime (seconds). */
const RIPPLE_SPEED = 46;
export const RIPPLE_LIFE = 1.8;

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

export interface Ripple {
  x: number;
  y: number;
  /** Seconds since it started. */
  age: number;
  /** 0..1 strength. */
  power: number;
}

export interface FieldOptions {
  /** Overall brightness 0..1. */
  intensity: number;
  /** Rows scrolled, for a slow parallax drift. */
  scroll: number;
  /** 0..1: a warm glow rising from the bottom edge (page footer). */
  floor?: number;
  /**
   * Per-cell multiplier 0..1 (row-major), low where page text sits, so the
   * field fades out behind words. Null means no text anywhere.
   */
  quiet?: Float32Array | null;
  ripples?: readonly Ripple[];
}

/**
 * An evenly woven field of characters. Every other column carries a glyph;
 * brightness comes from large, domain-warped noise so it blends smoothly
 * from near-black into soft clouds whose hue drifts through the spectrum.
 * The pointer gently swells the field around it (`fade` eases that in and
 * out), ripples run outward through it, and it hushes behind text.
 */
export function drawField(
  grid: AsciiGrid,
  t: number,
  pointer: PointerInput,
  fade: number,
  options: FieldOptions = { intensity: 1, scroll: 0 },
): void {
  const { cols, rows } = grid;
  const quiet = options.quiet ?? null;
  const ripples = options.ripples ?? [];
  const flicker = Math.floor(t * 0.7);
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
      let level = 0.04 + Math.pow(cloud, 1.7) * 0.96;
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
          level += g * 0.6;
          hue += g * 0.3;
          hot = Math.max(hot, g);
        }
      }

      for (const r of ripples) {
        const dx = x - r.x;
        const dy = (y - r.y) * CELL_ASPECT;
        const d = Math.sqrt(dx * dx + dy * dy);
        const band = Math.abs(d - r.age * RIPPLE_SPEED);
        if (band < 4) {
          const k = (1 - band / 4) * (1 - r.age / RIPPLE_LIFE) * r.power;
          level += k * 0.55;
          hue += k * 0.3;
          hot = Math.max(hot, k);
        }
      }

      if (options.floor) {
        // Light pooling up from the bottom, brightest under the footer.
        const rise = smooth(0.35, 1, y / rows) * options.floor;
        level += rise * (0.45 + 0.4 * n);
        hue = hue * (1 - rise) + (0.35 + 0.5 * n) * rise;
      }

      level *= options.intensity;
      if (quiet) level *= quiet[y * cols + x] ?? 1;

      const h = hash(x, y);
      // Dither between brightness levels so the gradient has no bands.
      const shade = Math.min(0.999, Math.max(0, level + (h - 0.5) * 0.1));
      if (shade < 0.02) {
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

/** Advances ripples by dt seconds and drops finished ones. */
export function ageRipples(ripples: Ripple[], dt: number): Ripple[] {
  for (const r of ripples) r.age += dt;
  return ripples.filter((r) => r.age < RIPPLE_LIFE);
}

/**
 * Builds the quiet mask from text boxes given in grid cells: 1 away from
 * text, falling smoothly to `floor` inside each box (with a soft margin).
 */
export function quietMask(
  cols: number,
  rows: number,
  boxes: readonly {
    x: number;
    y: number;
    w: number;
    h: number;
    /** Overrides the default floor (lighter hush). */
    floor?: number;
    /** Margin scale: larger gives a wider, softer falloff. */
    soft?: number;
  }[],
  floor = 0.15,
): Float32Array {
  const out = new Float32Array(cols * rows).fill(1);
  for (const b of boxes) {
    const mx = 10 * (b.soft ?? 1);
    const my = 3 * (b.soft ?? 1);
    const low = b.floor ?? floor;
    const x0 = Math.max(0, Math.floor(b.x - mx));
    const x1 = Math.min(cols - 1, Math.ceil(b.x + b.w + mx));
    const y0 = Math.max(0, Math.floor(b.y - my));
    const y1 = Math.min(rows - 1, Math.ceil(b.y + b.h + my));
    for (let y = y0; y <= y1; y += 1) {
      const oy = Math.max(b.y - y, y - (b.y + b.h), 0) / my;
      for (let x = x0; x <= x1; x += 1) {
        const ox = Math.max(b.x - x, x - (b.x + b.w), 0) / mx;
        // Euclidean falloff: rounded, edgeless corners.
        const v = low + (1 - low) * smooth(0, 1, Math.hypot(ox, oy));
        const i = y * cols + x;
        if (v < out[i]!) out[i] = v;
      }
    }
  }
  return out;
}

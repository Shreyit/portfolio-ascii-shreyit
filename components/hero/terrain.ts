import type { AsciiGrid } from "@/components/ascii/engine/grid";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";

export const HERO_COLS = 100;
export const HERO_ROWS = 24;

// Palette indices (engine/palette.ts).
const FG = 0;
const MUTED = 1;
const ACCENT = 2;
const BORDER = 3;

const RAMP = " ..::"; // sparse land texture; contour lines carry the image
const CONTOURS = 7; // contour levels across the height range
const LAKE = 0.26; // heights below this are water
const CELL_ASPECT = 2; // cells are ~2x taller than wide

/** Deterministic hash of an integer lattice point to [0, 1]. */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value noise in [0, 1]. */
export function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = smooth(x - xi);
  const ty = smooth(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Smooth terrain: two octaves of value noise drifting slowly over time. */
export function height(x: number, y: number, t: number): number {
  const drift = t * 0.04;
  let v = 0;
  let amp = 0.6;
  let freq = 0.035;
  for (let o = 0; o < 2; o += 1) {
    v += amp * noise(x * freq + drift, y * freq * CELL_ASPECT - drift * 0.6);
    amp *= 0.5;
    freq *= 2.3;
  }
  return Math.min(1, Math.max(0, (v - 0.1) / 0.8));
}

const NO_POINTER: PointerInput = { x: 0, y: 0, active: false };

/** Picks a line character perpendicular to the local slope. */
function contourChar(gx: number, gy: number): string {
  const a = (((Math.atan2(gy, gx) % Math.PI) + Math.PI) % Math.PI) / Math.PI;
  if (a < 0.125 || a > 0.875) return "|";
  if (a < 0.375) return "\\";
  if (a < 0.625) return "-";
  return "/";
}

/** Draws one frame. `lift` (0..1) eases the pointer's hill in and out. */
export function drawTerrain(
  grid: AsciiGrid,
  t: number,
  pointer: PointerInput,
  lift: number,
): void {
  const { cols, rows } = grid;
  const field = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      let h = height(x, y, t);
      if (lift > 0) {
        const dx = x - pointer.x;
        const dy = (y - pointer.y) * CELL_ASPECT;
        h += 0.45 * lift * Math.exp(-(dx * dx + dy * dy) / 90);
      }
      field[y * cols + x] = Math.min(1, h);
    }
  }
  const at = (x: number, y: number) =>
    field[
      Math.min(rows - 1, Math.max(0, y)) * cols +
        Math.min(cols - 1, Math.max(0, x))
    ]!;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const h = at(x, y);

      if (h < LAKE) {
        // Water: sparse ripples drifting with time.
        const ripple = noise(x * 0.35 + t * 0.9, y * 0.9 - t * 0.3) > 0.8;
        grid.set(x, y, ripple ? "~" : " ", ripple ? ACCENT : BORDER);
        continue;
      }

      // Single-width contour lines where the level steps up to a neighbour.
      const level = Math.floor(h * CONTOURS);
      if (
        level < Math.floor(at(x + 1, y) * CONTOURS) ||
        level < Math.floor(at(x, y + 1) * CONTOURS)
      ) {
        const gx = at(x + 1, y) - at(x - 1, y);
        const gy = (at(x, y + 1) - at(x, y - 1)) * CELL_ASPECT;
        grid.set(
          x,
          y,
          contourChar(gx, gy),
          level >= CONTOURS - 2 ? FG : ACCENT,
        );
        continue;
      }

      // Sparse, dithered texture between the lines.
      const t01 = (h - LAKE) / (1 - LAKE);
      const shade =
        (x + y) % 2 === 0
          ? RAMP[Math.min(RAMP.length - 1, Math.floor(t01 * RAMP.length))]!
          : " ";
      grid.set(x, y, shade, t01 > 0.7 ? FG : MUTED);
    }
  }
}

export function createTerrainScene(): AsciiScene {
  let lift = 0;
  const pointer: PointerInput = { x: 0, y: 0, active: false };
  return {
    init() {},
    update(grid, timeMs, dtMs, input) {
      // Ease the hill in and out, and follow the pointer smoothly.
      const k = Math.min(1, dtMs / 120);
      lift += ((input.active ? 1 : 0) - lift) * k;
      if (input.active) {
        const follow = pointer.active ? k : 1;
        pointer.x += (input.x - pointer.x) * follow;
        pointer.y += (input.y - pointer.y) * follow;
      }
      pointer.active = input.active;
      drawTerrain(grid, timeMs / 1000, pointer, lift);
    },
    staticFrame(grid) {
      drawTerrain(grid, 12, NO_POINTER, 0);
    },
  };
}

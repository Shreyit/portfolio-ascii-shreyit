// Test fixture scene — not portfolio content.
import { AsciiGrid } from "../grid";
import { RAMPS, rampChar } from "../ramps";
import type { AsciiScene } from "../scene";

const STATIC_TIME_MS = 1200;

function renderField(grid: AsciiGrid, timeMs: number): void {
  const t = timeMs / 1000;
  for (let y = 0; y < grid.rows; y += 1) {
    const ny = (y / grid.rows) * 6;
    for (let x = 0; x < grid.cols; x += 1) {
      const nx = (x / grid.cols) * 12;
      let v =
        Math.sin(nx + t * 0.9) +
        Math.sin(ny * 1.35 - t * 0.6) +
        Math.sin((nx + ny) * 0.75 + t * 0.7) +
        Math.sin(Math.hypot(nx - 6, ny - 3) * 1.4 - t * 1.1);
      v = (v + 4) / 8;

      const char = rampChar(RAMPS.standard, v);
      const color = v > 0.72 ? 2 : v > 0.38 ? 0 : 1;
      grid.set(x, y, char, color);
    }
  }
}

export function createPlasmaScene(): AsciiScene {
  return {
    init(): void {
      // Nothing to precompute — the field is a pure function of time.
    },
    update(grid: AsciiGrid, timeMs: number): void {
      renderField(grid, timeMs % 100000);
    },
    staticFrame(grid: AsciiGrid): void {
      renderField(grid, STATIC_TIME_MS);
    },
  };
}

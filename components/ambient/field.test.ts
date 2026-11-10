import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { SPECTRUM_BASE, LEVELS } from "@/components/ascii/engine/palette";
import { SWELL_RADIUS, drawField } from "./field";

const near = (x: number, y: number, cx: number, cy: number, r: number) =>
  Math.hypot(x - cx, (y - cy) * 2) < r;

/** Mean brightness level (0..LEVELS-1) of the inked cells within r. */
const brightness = (grid: AsciiGrid, cx: number, cy: number, r: number) => {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      if (!near(x, y, cx, cy, r)) continue;
      const cell = grid.get(x, y)!;
      n += 1;
      if (cell.char !== " ") sum += 1 + ((cell.color - SPECTRUM_BASE) % LEVELS);
    }
  }
  return sum / n;
};

describe("ambient field", () => {
  it("draws only spectrum colours and leaves dark gaps", () => {
    const grid = new AsciiGrid(120, 40);
    drawField(grid, 3, { x: 0, y: 0, active: false }, 0);
    let blank = 0;
    for (let y = 0; y < grid.rows; y += 1) {
      for (let x = 0; x < grid.cols; x += 1) {
        const cell = grid.get(x, y)!;
        if (cell.char === " ") blank += 1;
        else expect(cell.color).toBeGreaterThanOrEqual(SPECTRUM_BASE);
      }
    }
    expect(blank).toBeGreaterThan(0);
    expect(blank).toBeLessThan(120 * 40);
  });

  it("brightens around the pointer", () => {
    const off = new AsciiGrid(120, 40);
    const on = new AsciiGrid(120, 40);
    const dim = { intensity: 0.4, scroll: 0 };
    drawField(off, 4, { x: 30, y: 20, active: false }, 0, dim);
    drawField(on, 4, { x: 30, y: 20, active: true }, 1, dim);
    const r = SWELL_RADIUS * 0.25;
    expect(brightness(on, 30, 20, r)).toBeGreaterThan(
      brightness(off, 30, 20, r) + 0.5,
    );
    // Far away the field is unchanged.
    expect(on.get(110, 2)).toEqual(off.get(110, 2));
  });

  it("dims with intensity", () => {
    const full = new AsciiGrid(120, 40);
    const dim = new AsciiGrid(120, 40);
    const p = { x: 0, y: 0, active: false };
    drawField(full, 5, p, 0, { intensity: 1, scroll: 0 });
    drawField(dim, 5, p, 0, { intensity: 0.4, scroll: 0 });
    expect(brightness(dim, 60, 20, 200)).toBeLessThan(
      brightness(full, 60, 20, 200),
    );
  });

  it("is calmer in the centre than at the sides, without steps", () => {
    const grid = new AsciiGrid(200, 40);
    drawField(grid, 5, { x: 0, y: 0, active: false }, 0);
    const col = (x0: number) => brightness(grid, x0, 20, 12);
    expect(col(100)).toBeLessThan(Math.max(col(15), col(185)));
  });
});

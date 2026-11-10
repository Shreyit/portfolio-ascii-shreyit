import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { CLEAR_RADIUS, drawField } from "./field";

const ink = (grid: AsciiGrid, cx: number, cy: number, r: number) => {
  let n = 0;
  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      const near = Math.hypot(x - cx, (y - cy) * 2) < r;
      if (near && grid.get(x, y)!.char !== " ") n += 1;
    }
  }
  return n;
};

describe("ambient field", () => {
  it("is sparse: most cells stay blank", () => {
    const grid = new AsciiGrid(120, 40);
    drawField(grid, 3, { x: 0, y: 0, active: false }, 0);
    const text = grid.toPlainText().replace(/\n/g, "");
    const filled = [...text].filter((c) => c !== " ").length;
    expect(filled).toBeGreaterThan(0);
    expect(filled / text.length).toBeLessThan(0.35);
  });

  it("clears around the pointer", () => {
    const off = new AsciiGrid(120, 40);
    const on = new AsciiGrid(120, 40);
    let t = 0;
    // Find a moment where the area near the centre has some ink.
    while (ink(off, 60, 20, CLEAR_RADIUS * 0.5) === 0 && t < 50) {
      t += 1;
      drawField(off, t, { x: 60, y: 20, active: false }, 0);
    }
    drawField(on, t, { x: 60, y: 20, active: true }, 1);
    expect(ink(off, 60, 20, CLEAR_RADIUS * 0.5)).toBeGreaterThan(0);
    expect(ink(on, 60, 20, CLEAR_RADIUS * 0.5)).toBe(0);
  });
});

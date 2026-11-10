import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { REVEAL_RADIUS, drawField } from "./field";

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

  it("reveals dense accent ASCII around the pointer", () => {
    const off = new AsciiGrid(120, 40);
    const on = new AsciiGrid(120, 40);
    drawField(off, 4, { x: 60, y: 20, active: false }, 0);
    drawField(on, 4, { x: 60, y: 20, active: true }, 1);
    const r = REVEAL_RADIUS * 0.4;
    expect(ink(on, 60, 20, r)).toBeGreaterThan(ink(off, 60, 20, r) * 2);
    // The centre is drawn in the accent colour (palette index 2).
    let accent = 0;
    for (let y = 18; y <= 22; y += 1) {
      for (let x = 56; x <= 64; x += 1) {
        if (on.get(x, y)!.color === 2 && on.get(x, y)!.char !== " ")
          accent += 1;
      }
    }
    expect(accent).toBeGreaterThan(10);
    // Far away the field is unchanged.
    expect(on.get(2, 2)).toEqual(off.get(2, 2));
  });
});

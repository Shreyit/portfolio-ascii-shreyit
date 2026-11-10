import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import {
  HERO_COLS,
  HERO_ROWS,
  createTerrainScene,
  drawTerrain,
  height,
} from "./terrain";

describe("terrain", () => {
  it("is deterministic and stays within [0, 1]", () => {
    for (let i = 0; i < 200; i += 1) {
      const h = height(i * 1.7, i * 0.3, i * 0.1);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
      expect(height(i * 1.7, i * 0.3, i * 0.1)).toBe(h);
    }
  });

  it("draws a varied static frame with contours, land and water", () => {
    const grid = new AsciiGrid(HERO_COLS, HERO_ROWS);
    createTerrainScene().staticFrame(grid);
    const text = grid.toPlainText();
    if (process.env.PRINT_SCENE) console.log(text);
    expect(text).toMatch(/[|\\/]/); // contour lines
    expect(text).toMatch(/[.,:;=+*#]/); // shaded land
    expect(new Set(text.replace(/\s/g, "")).size).toBeGreaterThan(5);
  });

  it("raises the terrain under the pointer", () => {
    const flat = new AsciiGrid(HERO_COLS, HERO_ROWS);
    const lifted = new AsciiGrid(HERO_COLS, HERO_ROWS);
    drawTerrain(flat, 3, { x: 50, y: 12, active: false }, 0);
    drawTerrain(lifted, 3, { x: 50, y: 12, active: true }, 1);
    expect(lifted.toPlainText()).not.toBe(flat.toPlainText());
  });
});

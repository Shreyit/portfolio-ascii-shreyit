import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import {
  PORTRAIT_COLS,
  PORTRAIT_ROWS,
  createPortraitScene,
  portraitCells,
} from "./portrait";

describe("portrait scene", () => {
  it("reproduces the imported ASCII art exactly at rest", () => {
    const grid = new AsciiGrid(PORTRAIT_COLS, PORTRAIT_ROWS);
    createPortraitScene().staticFrame(grid);
    const lines = grid.toPlainText().split("\n");
    for (const c of portraitCells()) expect(lines[c.y]![c.x]).toBe(c.ch);
  });

  it("scatters under the pointer and springs back", () => {
    const scene = createPortraitScene();
    const grid = new AsciiGrid(PORTRAIT_COLS, PORTRAIT_ROWS);
    const rest = new AsciiGrid(PORTRAIT_COLS, PORTRAIT_ROWS);
    scene.staticFrame(rest);
    const at = { x: PORTRAIT_COLS / 2, y: PORTRAIT_ROWS / 2, active: true };
    for (let i = 0; i < 10; i += 1) scene.update(grid, i * 33, 33, at);
    expect(grid.toPlainText()).not.toBe(rest.toPlainText());
    const away = { x: 0, y: 0, active: false };
    for (let i = 0; i < 200; i += 1) scene.update(grid, 400 + i * 33, 33, away);
    expect(grid.toPlainText()).toBe(rest.toPlainText());
  });
});

import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { NAME_COLS, NAME_ROWS, createNameScene, nameCells } from "./name";

describe("name scene", () => {
  it("spells the name within the grid", () => {
    const cells = nameCells();
    expect(cells.length).toBeGreaterThan(100);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(NAME_COLS);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(NAME_ROWS);
    }
    const grid = new AsciiGrid(NAME_COLS, NAME_ROWS);
    createNameScene().staticFrame(grid);
    if (process.env.PRINT_SCENE) console.log(grid.toPlainText());
  });

  it("pushes characters away from the pointer and springs them home", () => {
    const scene = createNameScene();
    const grid = new AsciiGrid(NAME_COLS, NAME_ROWS);
    const rest = new AsciiGrid(NAME_COLS, NAME_ROWS);
    scene.staticFrame(rest);
    const pointer = { x: NAME_COLS / 4, y: 4, active: true };
    for (let i = 0; i < 10; i += 1) scene.update(grid, i * 33, 33, pointer);
    expect(grid.toPlainText()).not.toBe(rest.toPlainText());

    const away = { x: 0, y: 0, active: false };
    for (let i = 0; i < 200; i += 1) scene.update(grid, 400 + i * 33, 33, away);
    // Back home: every home cell is ink again (shimmer may vary the glyph).
    const lines = grid.toPlainText().split("\n");
    for (const c of nameCells()) expect(lines[c.y]![c.x]).not.toBe(" ");
  });

  it("a burst scatters the name", () => {
    const scene = createNameScene();
    const grid = new AsciiGrid(NAME_COLS, NAME_ROWS);
    scene.burst();
    for (let i = 0; i < 4; i += 1)
      scene.update(grid, i * 33, 33, { x: 0, y: 0, active: false });
    const lines = grid.toPlainText().split("\n");
    const home = nameCells().filter((c) => lines[c.y]![c.x] === " ");
    expect(home.length).toBeGreaterThan(nameCells().length / 3);
  });
});

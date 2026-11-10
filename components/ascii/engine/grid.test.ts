import { describe, expect, it } from "vitest";
import { AsciiGrid } from "./grid";

describe("AsciiGrid", () => {
  it("sets and gets a cell", () => {
    const grid = new AsciiGrid(4, 2);
    grid.set(1, 1, "A", 2);
    expect(grid.get(1, 1)).toEqual({ char: "A", color: 2 });
  });

  it("is a no-op (and marks nothing dirty) when the cell is unchanged", () => {
    const grid = new AsciiGrid(2, 1);
    grid.clearDirty();
    grid.set(0, 0, "x", 1);
    grid.set(0, 0, "y", 1); // different -> dirty
    grid.clearDirty();
    grid.set(0, 0, "y", 1); // identical -> no-op
    expect(grid.dirtyCount).toBe(0);
    expect(grid.dirty[0]).toBe(0);
    grid.set(0, 0, "y", 2); // same char, different color -> dirty
    expect(grid.dirtyCount).toBe(1);
  });

  it("ignores out-of-bounds writes", () => {
    const grid = new AsciiGrid(2, 2);
    grid.clearDirty();
    grid.set(-1, 0, "a");
    grid.set(0, -1, "a");
    grid.set(2, 0, "a");
    grid.set(0, 2, "a");
    expect(grid.dirtyCount).toBe(0);
    expect(grid.get(-1, 0)).toBeNull();
    expect(grid.get(2, 0)).toBeNull();
  });

  it("writeText writes consecutive cells", () => {
    const grid = new AsciiGrid(10, 1);
    grid.clearDirty();
    grid.writeText(2, 0, "hey", 1);
    expect(grid.get(2, 0)?.char).toBe("h");
    expect(grid.get(3, 0)?.char).toBe("e");
    expect(grid.get(4, 0)?.char).toBe("y");
    expect(grid.dirtyCount).toBe(3);
  });

  it("resize marks every cell dirty", () => {
    const grid = new AsciiGrid(2, 2);
    grid.clearDirty();
    grid.resize(3, 3);
    expect(grid.dirtyCount).toBe(9);
    expect(grid.get(0, 0)?.char).toBe(" ");
  });

  it("toPlainText keeps trailing spaces and joins rows", () => {
    const grid = new AsciiGrid(4, 2);
    grid.writeText(0, 0, "ab");
    grid.writeText(0, 1, "cd");
    expect(grid.toPlainText()).toBe("ab  \ncd  ");
  });
});

import type { AsciiGrid } from "./grid";

/** Pointer position in grid cells (fractional), when over the scene. */
export interface PointerInput {
  x: number;
  y: number;
  active: boolean;
}

export interface AsciiScene {
  init(grid: AsciiGrid): void;
  update(
    grid: AsciiGrid,
    timeMs: number,
    dtMs: number,
    pointer: PointerInput,
  ): void;
  /**
   * Draws a single representative frame. Used for reduced motion and the
   * server/no-JS fallback — must not depend on DOM, canvas or clocks.
   */
  staticFrame(grid: AsciiGrid): void;
}

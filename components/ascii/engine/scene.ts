import type { AsciiGrid } from "./grid";

export interface AsciiScene {
  init(grid: AsciiGrid): void;
  update(grid: AsciiGrid, timeMs: number, dtMs: number): void;
  /**
   * Draws a single representative frame. Used for reduced motion and the
   * server/no-JS fallback — must not depend on DOM, canvas or clocks.
   */
  staticFrame(grid: AsciiGrid): void;
}

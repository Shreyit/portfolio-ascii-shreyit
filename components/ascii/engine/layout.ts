import type { FontMetrics } from "./metrics";

export interface LayoutInput {
  /** CSS size of the box the canvas must fill exactly. */
  cssWidth: number;
  cssHeight: number;
  cols: number;
  rows: number;
  devicePixelRatio: number;
  maxDpr: number;
  font: FontMetrics;
}

/** Everything in device pixels unless stated otherwise. */
export interface CellLayout {
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
  /** Exact (fractional) cell size; cells are snapped per edge when drawn. */
  cellWidth: number;
  cellHeight: number;
  fontPx: number;
  /** Baseline offset from the top of a cell. */
  baseline: number;
  /** Horizontal offset that centres a glyph's advance inside its cell. */
  glyphOffsetX: number;
  /** Integer size of one atlas slot (large enough for any snapped cell). */
  slotWidth: number;
  slotHeight: number;
}

/**
 * Fits a cols x rows grid exactly into the given box, sizing the font from
 * the cell width.
 */
export function computeLayout(input: LayoutInput): CellLayout | null {
  const { cssWidth, cssHeight, cols, rows, font } = input;
  if (cssWidth <= 0 || cssHeight <= 0 || cols <= 0 || rows <= 0) {
    return null;
  }

  const dpr = Math.max(1, Math.min(input.devicePixelRatio || 1, input.maxDpr));
  const canvasWidth = Math.max(1, Math.round(cssWidth * dpr));
  const canvasHeight = Math.max(1, Math.round(cssHeight * dpr));
  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;

  // Like a terminal: the font fills the cell width exactly, so box-drawing
  // and block characters join up across cells. Glyphs are centred
  // vertically; the extreme tips of the tallest ones may be trimmed at the
  // cell edge rather than shrinking every glyph (which leaves gaps).
  const glyphExtent = font.ascent + font.descent;
  const fontPx = cellWidth / font.advance;

  const baseline =
    (cellHeight - glyphExtent * fontPx) / 2 + font.ascent * fontPx;
  const glyphOffsetX = (cellWidth - font.advance * fontPx) / 2;

  return {
    dpr,
    canvasWidth,
    canvasHeight,
    cellWidth,
    cellHeight,
    fontPx,
    baseline,
    glyphOffsetX,
    slotWidth: Math.ceil(cellWidth) + 1,
    slotHeight: Math.ceil(cellHeight) + 1,
  };
}

/** Snapped device-pixel span of cell index `i` for a fractional cell size. */
export function cellSpan(i: number, size: number): [number, number] {
  const start = Math.round(i * size);
  return [start, Math.round((i + 1) * size) - start];
}

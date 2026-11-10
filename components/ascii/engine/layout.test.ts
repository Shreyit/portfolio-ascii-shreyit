import { describe, expect, it } from "vitest";
import { cellSpan, computeLayout } from "./layout";

// JetBrains Mono-like metrics; tall glyphs reach above the 1.2 line box.
const font = { advance: 0.6, ascent: 0.95, descent: 0.3 };

describe("computeLayout", () => {
  it("fills the box exactly in device pixels", () => {
    const layout = computeLayout({
      cssWidth: 1152,
      cssHeight: 864,
      cols: 160,
      rows: 60,
      devicePixelRatio: 2,
      maxDpr: 2,
      font,
    })!;
    expect(layout.canvasWidth).toBe(2304);
    expect(layout.canvasHeight).toBe(1728);
    expect(layout.cellWidth * 160).toBeCloseTo(2304);
    expect(layout.cellHeight * 60).toBeCloseTo(1728);
  });

  it("caps the device pixel ratio", () => {
    const layout = computeLayout({
      cssWidth: 100,
      cssHeight: 50,
      cols: 10,
      rows: 5,
      devicePixelRatio: 3,
      maxDpr: 2,
      font,
    })!;
    expect(layout.dpr).toBe(2);
    expect(layout.canvasWidth).toBe(200);
  });

  it("fills the cell width and centres glyphs vertically", () => {
    const layout = computeLayout({
      cssWidth: 600,
      cssHeight: 120,
      cols: 100,
      rows: 10,
      devicePixelRatio: 1,
      maxDpr: 2,
      font,
    })!;
    // Adjacent glyph advances touch: box-drawing lines connect.
    expect(font.advance * layout.fontPx).toBeCloseTo(layout.cellWidth);
    expect(layout.glyphOffsetX).toBeCloseTo(0);
    const top = layout.baseline - font.ascent * layout.fontPx;
    const bottom = layout.baseline + font.descent * layout.fontPx;
    expect((top + bottom) / 2).toBeCloseTo(layout.cellHeight / 2);
  });

  it("returns null for an empty box", () => {
    expect(
      computeLayout({
        cssWidth: 0,
        cssHeight: 10,
        cols: 1,
        rows: 1,
        devicePixelRatio: 1,
        maxDpr: 2,
        font,
      }),
    ).toBeNull();
  });
});

describe("cellSpan", () => {
  it("tiles fractional cells with no gaps or overlaps", () => {
    const size = 14.4;
    let edge = 0;
    for (let i = 0; i < 160; i += 1) {
      const [start, width] = cellSpan(i, size);
      expect(start).toBe(edge);
      expect(width).toBeGreaterThan(0);
      edge = start + width;
    }
    expect(edge).toBe(Math.round(160 * size));
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  MAX_ATLAS_SIZE,
  GlyphAtlas,
  acquireAtlas,
  sharedAtlasCount,
  type AtlasOptions,
  type AtlasCanvas,
} from "./glyph-atlas";

function fakeCanvas(width: number, height: number): AtlasCanvas {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    font: "",
    textBaseline: "",
    fillStyle: "",
  };
  return { width, height, getContext: () => ctx } as unknown as AtlasCanvas;
}

function options(overrides: Partial<AtlasOptions> = {}): AtlasOptions {
  return {
    slotWidth: 10,
    slotHeight: 20,
    baseline: 15,
    glyphOffsetX: 0,
    fontFamily: "mono",
    fontPx: 16,
    colors: ["#fff", "#888", "#0f0", "#333"],
    createCanvas: fakeCanvas,
    ...overrides,
  };
}

describe("GlyphAtlas", () => {
  it("starts small instead of allocating the maximum surface", () => {
    const atlas = new GlyphAtlas(options());
    expect(atlas.size.width).toBe(320);
    expect(atlas.size.height).toBe(80);
  });

  it("caches glyphs per (char, colour)", () => {
    const atlas = new GlyphAtlas(options());
    const a = atlas.get(65, 0);
    expect(atlas.get(65, 0)).toBe(a);
    expect(atlas.get(65, 1)).not.toEqual(a);
  });

  it("grows when full and returns null at the maximum size", () => {
    const atlas = new GlyphAtlas(
      options({ slotWidth: 1024, slotHeight: 1024 }),
    );
    expect(atlas.get(65, 0)).not.toBeNull();
    expect(atlas.get(66, 0)).not.toBeNull();
    expect(atlas.get(67, 0)).not.toBeNull(); // grows to 2048 high
    expect(atlas.size.height).toBe(MAX_ATLAS_SIZE);
    expect(atlas.get(68, 0)).not.toBeNull();
    expect(atlas.get(69, 0)).toBeNull(); // full → caller falls back
  });
});

describe("shared atlases", () => {
  it("shares one atlas per key and frees it after the last release", () => {
    const before = sharedAtlasCount();
    const a = acquireAtlas(options());
    const b = acquireAtlas(options());
    expect(a.atlas).toBe(b.atlas);
    expect(sharedAtlasCount()).toBe(before + 1);

    const other = acquireAtlas(
      options({ colors: ["#000", "#111", "#222", "#333"] }),
    );
    expect(other.atlas).not.toBe(a.atlas);

    a.release();
    a.release(); // idempotent
    expect(sharedAtlasCount()).toBe(before + 2);
    b.release();
    other.release();
    expect(sharedAtlasCount()).toBe(before);
  });
});

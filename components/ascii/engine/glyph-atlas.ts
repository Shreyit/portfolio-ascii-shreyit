export interface GlyphRect {
  sx: number;
  sy: number;
}

export type AtlasCanvas = OffscreenCanvas | HTMLCanvasElement;
type AtlasContext =
  OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
export type CanvasFactory = (width: number, height: number) => AtlasCanvas;

export interface AtlasOptions {
  slotWidth: number; // device px
  slotHeight: number; // device px
  baseline: number; // device px from slot top
  glyphOffsetX: number; // device px
  fontFamily: string;
  fontPx: number; // device px
  colors: readonly string[]; // palette by index
  createCanvas?: CanvasFactory;
}

export const MAX_ATLAS_SIZE = 2048;
const INITIAL_SLOTS_PER_ROW = 32;
const INITIAL_ROWS = 4;

function defaultCanvas(width: number, height: number): AtlasCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Pre-rendered (char, colour) glyphs. Starts small and doubles its height
 * on demand up to MAX_ATLAS_SIZE, so a scene using a 10-character ramp in
 * 3 colours costs a few KB rather than a fixed 16 MB surface.
 */
export class GlyphAtlas {
  private canvas: AtlasCanvas;
  private ctx: AtlasContext;
  private readonly glyphs = new Map<number, GlyphRect | null>();
  private readonly options: AtlasOptions;
  private readonly createCanvas: CanvasFactory;
  private cursorX = 0;
  private cursorY = 0;

  constructor(options: AtlasOptions) {
    this.options = options;
    this.createCanvas = options.createCanvas ?? defaultCanvas;
    const width = Math.min(
      MAX_ATLAS_SIZE,
      options.slotWidth * INITIAL_SLOTS_PER_ROW,
    );
    const height = Math.min(MAX_ATLAS_SIZE, options.slotHeight * INITIAL_ROWS);
    this.canvas = this.createCanvas(width, height);
    this.ctx = this.context(this.canvas);
  }

  get source(): AtlasCanvas {
    return this.canvas;
  }

  get size(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  /** Returns the slot for a glyph, rendering it on first use; null if full. */
  get(charCode: number, colorIndex: number): GlyphRect | null {
    const key = charCode * 256 + colorIndex;
    const cached = this.glyphs.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const rect = this.place();
    if (rect) {
      this.draw(rect, charCode, colorIndex);
    }
    this.glyphs.set(key, rect);
    return rect;
  }

  private place(): GlyphRect | null {
    const { slotWidth, slotHeight } = this.options;
    if (this.cursorX + slotWidth > this.canvas.width) {
      this.cursorX = 0;
      this.cursorY += slotHeight;
    }
    if (this.cursorY + slotHeight > this.canvas.height && !this.grow()) {
      return null;
    }
    const rect = { sx: this.cursorX, sy: this.cursorY };
    this.cursorX += slotWidth;
    return rect;
  }

  private grow(): boolean {
    const height = Math.min(MAX_ATLAS_SIZE, this.canvas.height * 2);
    if (
      height <= this.canvas.height ||
      this.cursorY + this.options.slotHeight > height
    ) {
      return false;
    }
    const next = this.createCanvas(this.canvas.width, height);
    const ctx = this.context(next);
    ctx.drawImage(this.canvas, 0, 0);
    this.canvas = next;
    this.ctx = ctx;
    return true;
  }

  private draw(rect: GlyphRect, charCode: number, colorIndex: number): void {
    const o = this.options;
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.sx, rect.sy, o.slotWidth, o.slotHeight);
    ctx.clip();
    ctx.font = `${o.fontPx}px ${o.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = o.colors[colorIndex] ?? o.colors[0] ?? "#888";
    ctx.fillText(
      String.fromCharCode(charCode),
      rect.sx + o.glyphOffsetX,
      rect.sy + o.baseline,
    );
    ctx.restore();
  }

  private context(canvas: AtlasCanvas): AtlasContext {
    const ctx = canvas.getContext("2d") as AtlasContext | null;
    if (!ctx) {
      throw new Error("GlyphAtlas: 2d context unavailable");
    }
    return ctx;
  }
}

// Shared, reference-counted atlases: instances with the same font size, cell
// size and palette draw from one surface; it is freed when the last releases.
const shared = new Map<string, { atlas: GlyphAtlas; refs: number }>();

export function atlasKey(options: AtlasOptions): string {
  return [
    options.fontFamily,
    options.fontPx.toFixed(3),
    options.slotWidth,
    options.slotHeight,
    options.baseline.toFixed(3),
    options.glyphOffsetX.toFixed(3),
    options.colors.join(","),
  ].join("|");
}

export function acquireAtlas(options: AtlasOptions): {
  atlas: GlyphAtlas;
  release: () => void;
} {
  const key = atlasKey(options);
  let entry = shared.get(key);
  if (!entry) {
    entry = { atlas: new GlyphAtlas(options), refs: 0 };
    shared.set(key, entry);
  }
  entry.refs += 1;
  let released = false;
  return {
    atlas: entry.atlas,
    release: () => {
      if (released) {
        return;
      }
      released = true;
      const current = shared.get(key);
      if (current && --current.refs <= 0) {
        shared.delete(key);
      }
    },
  };
}

/** Test helper: number of live shared atlases. */
export function sharedAtlasCount(): number {
  return shared.size;
}

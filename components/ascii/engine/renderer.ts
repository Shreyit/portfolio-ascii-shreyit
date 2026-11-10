import { AsciiGrid } from "./grid";
import { acquireAtlas, type GlyphAtlas } from "./glyph-atlas";
import { cellSpan, computeLayout, type CellLayout } from "./layout";
import { measureFont, type FontMetrics } from "./metrics";
import { onThemeChange, readPalette, type Palette } from "./palette";

export interface CanvasRendererOptions {
  fontFamily: string;
  maxDpr?: number;
}

export interface RendererStats {
  frames: number;
  cellsDrawn: number;
  lastFrameMs: number;
}

/**
 * Draws an AsciiGrid onto a canvas that exactly fills a CSS box. Only dirty
 * cells are drawn; resize, DPR and theme changes trigger a full redraw.
 */
export class CanvasRenderer {
  readonly stats: RendererStats = { frames: 0, cellsDrawn: 0, lastFrameMs: 0 };

  private readonly canvas: HTMLCanvasElement;
  private readonly grid: AsciiGrid;
  private readonly fontFamily: string;
  private readonly maxDpr: number;
  private ctx: CanvasRenderingContext2D | null = null;
  private font: FontMetrics | null = null;
  private layout: CellLayout | null = null;
  private palette: Palette | null = null;
  private atlas: GlyphAtlas | null = null;
  private releaseAtlas: (() => void) | null = null;
  private cssSize = { width: 0, height: 0 };
  private unsubscribeTheme: (() => void) | null = null;
  private dprMedia: MediaQueryList | null = null;
  private destroyed = false;

  constructor(
    canvas: HTMLCanvasElement,
    grid: AsciiGrid,
    options: CanvasRendererOptions,
  ) {
    this.canvas = canvas;
    this.grid = grid;
    this.fontFamily = options.fontFamily;
    this.maxDpr = options.maxDpr ?? 2;
  }

  /** Measures the font and lays out for the given CSS box. */
  async init(cssWidth: number, cssHeight: number): Promise<void> {
    this.font = await measureFont(this.fontFamily);
    if (this.destroyed) {
      return;
    }
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.palette = readPalette(document.documentElement);
    this.unsubscribeTheme = onThemeChange(() => this.refreshPalette());
    this.resize(cssWidth, cssHeight);
  }

  /** Re-fits the canvas to a new CSS box (also used for DPR changes). */
  resize(cssWidth: number, cssHeight: number): void {
    if (this.destroyed || !this.font) {
      return;
    }
    this.cssSize = { width: cssWidth, height: cssHeight };
    const layout = computeLayout({
      cssWidth,
      cssHeight,
      cols: this.grid.cols,
      rows: this.grid.rows,
      devicePixelRatio: window.devicePixelRatio,
      maxDpr: this.maxDpr,
      font: this.font,
    });
    if (!layout) {
      return;
    }
    const changed =
      !this.layout ||
      layout.canvasWidth !== this.layout.canvasWidth ||
      layout.canvasHeight !== this.layout.canvasHeight;
    if (!changed) {
      return;
    }
    this.layout = layout;
    // Setting the backing size clears the canvas.
    this.canvas.width = layout.canvasWidth;
    this.canvas.height = layout.canvasHeight;
    this.watchDpr();
    this.rebuildAtlas();
    this.fullRedraw();
  }

  render(): void {
    const start = performance.now();
    const { ctx, layout, palette, atlas } = this;
    if (!ctx || !layout || !palette) {
      return;
    }
    const { chars, colors } = this.grid;

    this.grid.forEachDirty((x, y, i) => {
      const [dx, dw] = cellSpan(x, layout.cellWidth);
      const [dy, dh] = cellSpan(y, layout.cellHeight);
      ctx.fillStyle = palette.bg;
      ctx.fillRect(dx, dy, dw, dh);

      const code = chars[i]!;
      if (code === 32) {
        return; // space: background only
      }
      const color = colors[i]!;
      const rect = atlas?.get(code, color) ?? null;
      if (rect && atlas) {
        // Source and destination are the same size: no resampling blur.
        ctx.drawImage(atlas.source, rect.sx, rect.sy, dw, dh, dx, dy, dw, dh);
      } else {
        ctx.font = `${layout.fontPx}px ${this.fontFamily}`;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = palette.colors[color] ?? palette.colors[0];
        ctx.fillText(
          String.fromCharCode(code),
          dx + layout.glyphOffsetX,
          dy + layout.baseline,
        );
      }
    });

    this.stats.cellsDrawn += this.grid.dirtyCount;
    this.grid.clearDirty();
    this.stats.frames += 1;
    this.stats.lastFrameMs = performance.now() - start;
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubscribeTheme?.();
    this.unsubscribeTheme = null;
    this.dprMedia?.removeEventListener("change", this.onDprChange);
    this.dprMedia = null;
    this.releaseAtlas?.();
    this.releaseAtlas = null;
    this.atlas = null;
    this.ctx = null;
  }

  private refreshPalette(): void {
    if (this.destroyed) {
      return;
    }
    this.palette = readPalette(document.documentElement);
    this.rebuildAtlas();
    this.fullRedraw();
  }

  private rebuildAtlas(): void {
    const { layout, palette } = this;
    if (!layout || !palette) {
      return;
    }
    const next = acquireAtlas({
      slotWidth: layout.slotWidth,
      slotHeight: layout.slotHeight,
      baseline: layout.baseline,
      glyphOffsetX: layout.glyphOffsetX,
      fontFamily: this.fontFamily,
      fontPx: layout.fontPx,
      colors: palette.colors,
    });
    // Acquire before releasing so a shared atlas is not freed and rebuilt.
    this.releaseAtlas?.();
    this.atlas = next.atlas;
    this.releaseAtlas = next.release;
  }

  private fullRedraw(): void {
    if (this.ctx && this.palette) {
      this.ctx.fillStyle = this.palette.bg;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.grid.markAllDirty();
  }

  private watchDpr(): void {
    // Query the real (uncapped) ratio: it flips to false when the window
    // moves to a screen with a different density.
    this.dprMedia?.removeEventListener("change", this.onDprChange);
    this.dprMedia = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    this.dprMedia.addEventListener("change", this.onDprChange);
  }

  private readonly onDprChange = () => {
    // Force a relayout at the same CSS size with the new device ratio.
    this.layout = null;
    this.resize(this.cssSize.width, this.cssSize.height);
  };
}

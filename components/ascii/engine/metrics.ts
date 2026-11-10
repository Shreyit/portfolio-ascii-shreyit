/**
 * Font metrics as ratios of the font size (1 = one font-size unit), so they
 * can be scaled to any cell size without re-measuring.
 */
export interface FontMetrics {
  /** Horizontal advance of one monospace cell. */
  advance: number;
  /** Tallest ascent across the glyphs the engine may draw. */
  ascent: number;
  /** Deepest descent across the glyphs the engine may draw. */
  descent: number;
}

const PROBE_PX = 100;
// Glyphs that reach furthest above the cap height or below the baseline.
// Measuring them (not just "M") keeps tall characters from being clipped.
const EXTREME_GLYPHS = "|$()[]{}@WMgjpqy_^`'\"%&#░▒▓█";

const cache = new Map<string, Promise<FontMetrics>>();

export function measureFont(fontFamily: string): Promise<FontMetrics> {
  let pending = cache.get(fontFamily);
  if (!pending) {
    pending = measure(fontFamily);
    cache.set(fontFamily, pending);
    // Do not cache failures — a later call can retry.
    pending.catch(() => cache.delete(fontFamily));
  }
  return pending;
}

async function measure(fontFamily: string): Promise<FontMetrics> {
  const font = `${PROBE_PX}px ${fontFamily}`;
  await document.fonts.load(font);

  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    throw new Error("measureFont: 2d context unavailable");
  }
  ctx.font = font;

  let ascent = 0;
  let descent = 0;
  for (const glyph of EXTREME_GLYPHS) {
    const m = ctx.measureText(glyph);
    ascent = Math.max(ascent, m.actualBoundingBoxAscent);
    descent = Math.max(descent, m.actualBoundingBoxDescent);
  }

  return {
    advance: ctx.measureText("M").width / PROBE_PX,
    ascent: ascent / PROBE_PX,
    descent: descent / PROBE_PX,
  };
}

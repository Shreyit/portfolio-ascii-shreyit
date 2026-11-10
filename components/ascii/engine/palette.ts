export interface Palette {
  bg: string;
  /**
   * Index 0=fg, 1=muted, 2=accent, 3=border, 4=error, then the spectrum:
   * HUE_STEPS hues × LEVELS brightness levels (see `spectrum`).
   */
  colors: string[];
}

/** First palette index of the spectrum block. */
export const SPECTRUM_BASE = 5;
/** Hues interpolated across the --spectrum-* stops. */
export const HUE_STEPS = 12;
/** Brightness levels per hue, from barely-there to full colour. */
export const LEVELS = 14;
/**
 * Brightness of each level (share of the hue mixed into the background).
 * Roughly geometric, so dim regions get many fine steps and glyphs fade
 * into black continuously instead of dropping out at a visible edge.
 */
const LEVEL_MIX = [
  0.012, 0.022, 0.035, 0.05, 0.07, 0.095, 0.125, 0.165, 0.215, 0.28, 0.37, 0.5,
  0.7, 1,
];
const SPECTRUM_STOPS = 6;

/**
 * Palette index for a spectrum colour. `hue` 0..1 runs indigo → violet →
 * pink → amber (wrapping is the caller's choice); `level` 0..1 is the
 * brightness, from the background colour to full strength.
 */
export function spectrum(hue: number, level: number): number {
  const h = Math.min(
    HUE_STEPS - 1,
    Math.max(0, Math.round(hue * (HUE_STEPS - 1))),
  );
  // `level` is brightness: pick the brightest level not above it.
  let l = 0;
  while (l + 1 < LEVELS && LEVEL_MIX[l + 1]! <= level) l += 1;
  return SPECTRUM_BASE + h * LEVELS + l;
}

type Rgb = [number, number, number];

function parseHex(value: string): Rgb | null {
  const m = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: Rgb) =>
  "#" +
  [r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Builds the HUE_STEPS × LEVELS spectrum block from stops and background. */
export function buildSpectrum(stops: readonly string[], bg: string): string[] {
  const base = parseHex(bg) ?? [0, 0, 0];
  const rgb = stops.map((s) => parseHex(s) ?? base);
  const out: string[] = [];
  for (let h = 0; h < HUE_STEPS; h += 1) {
    const pos = (h / (HUE_STEPS - 1)) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(pos));
    const hue = mix(rgb[i]!, rgb[i + 1]!, pos - i);
    for (const t of LEVEL_MIX) out.push(toHex(mix(base, hue, t)));
  }
  return out;
}

let probe: CanvasRenderingContext2D | null | undefined;

/** Normalises any CSS colour to #rrggbb via a 2D context (browser only). */
function normalise(value: string): string {
  if (probe === undefined) {
    probe = document.createElement("canvas").getContext("2d");
  }
  if (!probe || !value) return value;
  probe.fillStyle = "#000000";
  probe.fillStyle = value;
  return probe.fillStyle;
}

export function readPalette(element: Element): Palette {
  const styles = getComputedStyle(element);
  const read = (name: string) =>
    normalise(styles.getPropertyValue(name).trim());
  const bg = read("--bg");
  const stops = Array.from({ length: SPECTRUM_STOPS }, (_, i) =>
    read(`--spectrum-${i}`),
  );
  return {
    bg,
    colors: [
      read("--fg"),
      read("--muted"),
      read("--accent"),
      read("--border"),
      read("--error"),
      ...buildSpectrum(stops, bg),
    ],
  };
}

export function onThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const media = window.matchMedia("(prefers-color-scheme: light)");
  const onMedia = () => callback();
  media.addEventListener("change", onMedia);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMedia);
  };
}

import india from "@/content/generated/india-map.json";

// Equirectangular projection, x scaled by cos(mid-latitude) so shapes keep
// their proportions at India's latitudes. Grid cells are twice as tall as
// wide, so a cell spans twice as many degrees vertically.
const [MIN_LON, MIN_LAT, MAX_LON, MAX_LAT] = india.bbox as [
  number,
  number,
  number,
  number,
];
const MID_LAT = ((MIN_LAT + MAX_LAT) / 2) * (Math.PI / 180);
const SPAN_X = (MAX_LON - MIN_LON) * Math.cos(MID_LAT);
const SPAN_Y = MAX_LAT - MIN_LAT;

export const MAP_COLS = 92;
export const MAP_ROWS = Math.round((MAP_COLS * SPAN_Y) / SPAN_X / 2);
export const MAP_SOURCE = india.source;

type Ring = number[][];
interface State {
  name: string;
  rings: Ring[];
  box: [number, number, number, number];
}

const STATES: State[] = india.states.map((s) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ring of s.rings) {
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x!);
      y0 = Math.min(y0, y!);
      x1 = Math.max(x1, x!);
      y1 = Math.max(y1, y!);
    }
  }
  return { name: s.name, rings: s.rings, box: [x0, y0, x1, y1] };
});

export const STATE_NAMES: readonly string[] = STATES.map((s) => s.name);

/** Grid position (fractional cells) of a lon/lat. */
export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: (((lon - MIN_LON) * Math.cos(MID_LAT)) / SPAN_X) * MAP_COLS,
    y: ((MAX_LAT - lat) / SPAN_Y) * MAP_ROWS,
  };
}

function inside(lon: number, lat: number, rings: Ring[]): boolean {
  let hit = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (
        yi! > lat !== yj! > lat &&
        lon < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!
      ) {
        hit = !hit;
      }
    }
  }
  return hit;
}

function rasterise(w: number, h: number): Int8Array {
  const out = new Int8Array(w * h).fill(-1);
  for (let y = 0; y < h; y += 1) {
    const lat = MAX_LAT - ((y + 0.5) / h) * SPAN_Y;
    for (let x = 0; x < w; x += 1) {
      const lon = MIN_LON + ((x + 0.5) / w) * (MAX_LON - MIN_LON);
      for (let s = 0; s < STATES.length; s += 1) {
        const [x0, y0, x1, y1] = STATES[s]!.box;
        if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
        if (inside(lon, lat, STATES[s]!.rings)) {
          out[y * w + x] = s;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * State index per cell (row-major), -1 for cells outside India. Sampled at
 * each cell's centre; computed once per module.
 */
let cached: Int8Array | null = null;
export function stateRaster(): Int8Array {
  cached ??= rasterise(MAP_COLS, MAP_ROWS);
  return cached;
}

/** Braille resolution: each cell holds a 2×4 grid of dots. */
export const SUB_W = MAP_COLS * 2;
export const SUB_H = MAP_ROWS * 4;

/** State index per braille dot (row-major, SUB_W × SUB_H), -1 outside. */
let cachedSub: Int8Array | null = null;
export function subRaster(): Int8Array {
  cachedSub ??= rasterise(SUB_W, SUB_H);
  return cachedSub;
}

import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";
import {
  MAP_COLS,
  MAP_ROWS,
  STATE_NAMES,
  SUB_H,
  SUB_W,
  project,
  subRaster,
} from "./geo";

export type PlaceKind = "home" | "study" | "fieldwork" | "work";

/** Serializable place data (built on the server from content). */
export interface MapPlace {
  slug: string;
  name: string;
  /** State name exactly as in the boundary data (e.g. "Bihar"). */
  state: string;
  lon: number;
  lat: number;
  kind: PlaceKind;
  /** Slug of the place this journey started from, if any. */
  from: string | null;
  /** Which side of the marker the label goes. */
  label: "left" | "right";
}

// Palette indices (engine/palette.ts).
const FG = 0;
const ACCENT = 2;

/** Hue per kind along the spectrum (0 indigo … 1 amber). */
export const KIND_HUE: Record<PlaceKind, number> = {
  home: 1,
  study: 0.45,
  fieldwork: 0.7,
  work: 0.32,
};

const COMETS_PER_FLOW = 2;
const FLOW_SECONDS = 3.4;
/** Tail length of a comet, in arc samples (≈ half a braille dot each). */
const TAIL = 14;
/** Pointer distance (cells) that counts as hovering a marker. */
const HIT = 3;

/** Unicode braille bit for the dot at (dx 0..1, dy 0..3) inside a cell. */
const BIT = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
] as const;
const bitAt = (sx: number, sy: number) => BIT[sx & 1]![sy & 3]!;

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Points along a curved arc (quadratic Bézier), in braille-dot units. */
function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y; // dots are square, so no aspect correction
  const len = Math.hypot(dx, dy) || 1;
  // Bow perpendicular to the chord, a fifth of its length.
  const cx = mx - dy * 0.2;
  const cy = my + dx * 0.2;
  const pts: { x: number; y: number }[] = [];
  const steps = Math.max(12, Math.ceil(len * 2));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
    });
  }
  return pts;
}

export interface MapScene extends AsciiScene {
  /** Highlight one place (and its journey), or none. */
  setActive(slug: string | null): void;
  /** The place under the pointer, if any. */
  readonly hovered: string | null;
}

/**
 * India in braille dots: fine coastlines and state borders, a light stipple
 * over the land, the states I have lived and worked in filled in their own
 * hue, and journeys as dotted arcs with comets running from origin to
 * destination.
 */
export function createMapScene(
  places: readonly MapPlace[],
  onHover?: (slug: string | null) => void,
): MapScene {
  const sub = subRaster();
  const cells = MAP_COLS * MAP_ROWS;
  const lit = new Map<number, number>(); // state index → place index
  places.forEach((p, i) => {
    const s = STATE_NAMES.indexOf(p.state);
    if (s >= 0 && !lit.has(s)) lit.set(s, i);
  });

  // Static layers, per cell: dots and what kind of ink they are.
  const landBits = new Uint8Array(cells);
  const lineBits = new Uint8Array(cells); // coast + borders
  const coastCell = new Uint8Array(cells);
  const litPlace = new Int8Array(cells).fill(-1);
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= SUB_W || y >= SUB_H ? -1 : sub[y * SUB_W + x]!;
  for (let sy = 0; sy < SUB_H; sy += 1) {
    for (let sx = 0; sx < SUB_W; sx += 1) {
      const s = sub[sy * SUB_W + sx]!;
      if (s < 0) continue;
      const coast =
        at(sx + 1, sy) < 0 ||
        at(sx - 1, sy) < 0 ||
        at(sx, sy + 1) < 0 ||
        at(sx, sy - 1) < 0;
      const right = at(sx + 1, sy);
      const down = at(sx, sy + 1);
      const border =
        !coast && ((right >= 0 && right !== s) || (down >= 0 && down !== s));
      const c = (sy >> 2) * MAP_COLS + (sx >> 1);
      const bit = bitAt(sx, sy);
      const place = lit.get(s);
      if (place !== undefined) litPlace[c] = place;
      if (coast || border) {
        lineBits[c]! |= bit;
        if (coast) coastCell[c] = 1;
      } else if (hash(sx, sy) < (place !== undefined ? 0.5 : 0.16)) {
        landBits[c]! |= bit;
      }
    }
  }

  // Places in dot and cell space.
  const dots = places.map((p) => {
    const { x, y } = project(p.lon, p.lat);
    return { x: x * 2, y: y * 4 };
  });
  const points = dots.map((d) => ({
    x: Math.floor(d.x / 2),
    y: Math.floor(d.y / 4),
  }));
  const flows: { to: number; pts: { x: number; y: number }[] }[] = [];
  places.forEach((p, i) => {
    const from = places.findIndex((q) => q.slug === p.from);
    if (from >= 0) flows.push({ to: i, pts: arc(dots[from]!, dots[i]!) });
  });

  let active = -1;
  let hovered = -1;
  const bits = new Uint8Array(cells);
  const colour = new Uint8Array(cells);

  const plot = (x: number, y: number, col: number) => {
    const sx = Math.round(x);
    const sy = Math.round(y);
    if (sx < 0 || sy < 0 || sx >= SUB_W || sy >= SUB_H) return;
    const c = (sy >> 2) * MAP_COLS + (sx >> 1);
    bits[c]! |= bitAt(sx, sy);
    colour[c] = col;
  };

  const draw = (grid: AsciiGrid, t: number | null) => {
    const focus = hovered >= 0 ? hovered : active;
    const time = t ?? 0;

    // Land, borders and lit states.
    for (let c = 0; c < cells; c += 1) {
      bits[c] = landBits[c]! | lineBits[c]!;
      const place = litPlace[c]!;
      if (place >= 0) {
        const on = place === focus;
        const pulse = on ? 0.12 + 0.08 * Math.sin(time * 4 + (c % 97)) : 0;
        colour[c] = spectrum(KIND_HUE[places[place]!.kind], 0.52 + pulse);
      } else if (coastCell[c]) {
        colour[c] = spectrum(0.22, 0.4);
      } else if (lineBits[c]) {
        colour[c] = spectrum(0.28, 0.26);
      } else {
        colour[c] = spectrum(0.15, 0.17);
      }
    }

    // Journeys: dotted arcs, comets running along them.
    for (const flow of flows) {
      const hue = KIND_HUE[places[flow.to]!.kind];
      const dim = focus >= 0 && focus !== flow.to;
      const trail = spectrum(hue, dim ? 0.2 : 0.42);
      flow.pts.forEach((p, i) => {
        if (i % 3 === 0) plot(p.x, p.y, trail);
      });
      if (t === null || dim) continue;
      const n = flow.pts.length;
      for (let k = 0; k < COMETS_PER_FLOW; k += 1) {
        const head = Math.floor(
          ((t / FLOW_SECONDS + k / COMETS_PER_FLOW) % 1) * n,
        );
        for (let j = TAIL - 1; j >= 0; j -= 1) {
          const p = flow.pts[head - j];
          if (!p) continue;
          plot(p.x, p.y, spectrum(hue, 1 - (j / TAIL) * 0.7));
        }
      }
    }

    // Markers: a solid dot, and a ring of dots expanding from the focus.
    places.forEach((place, i) => {
      const d = dots[i]!;
      const hue = KIND_HUE[place.kind];
      const on = i === hovered || i === active;
      if (on && t !== null) {
        const r = 2 + ((t * 1.5) % 1) * 5;
        for (let a = 0; a < 24; a += 1) {
          const ang = (a / 24) * Math.PI * 2;
          plot(
            d.x + Math.cos(ang) * r,
            d.y + Math.sin(ang) * r,
            spectrum(hue, 1 - (r - 2) / 7),
          );
        }
      }
      for (let y = -1; y <= 1; y += 1)
        for (let x = -1; x <= 1; x += 1)
          plot(d.x + x, d.y + y, on ? ACCENT : spectrum(hue, 1));
    });

    for (let c = 0; c < cells; c += 1) {
      const b = bits[c]!;
      grid.set(
        c % MAP_COLS,
        Math.floor(c / MAP_COLS),
        b ? String.fromCharCode(0x2800 + b) : " ",
        colour[c]!,
      );
    }

    // Labels, with a clear cell either side so they read cleanly.
    places.forEach((place, i) => {
      const { x, y } = points[i]!;
      const on = i === hovered || i === active;
      const label = place.name.toUpperCase();
      const lx = place.label === "right" ? x + 2 : x - 1 - label.length;
      grid.writeText(lx - 1, y, ` ${label} `, on ? ACCENT : FG);
    });
  };

  return {
    get hovered() {
      return hovered >= 0 ? places[hovered]!.slug : null;
    },
    setActive(slug) {
      active = places.findIndex((p) => p.slug === slug);
    },
    init(grid) {
      draw(grid, 0);
    },
    update(grid, timeMs, _dtMs, pointer: PointerInput) {
      let next = -1;
      if (pointer.active) {
        let best = HIT * HIT;
        points.forEach((p, i) => {
          const d = (p.x - pointer.x) ** 2 + ((p.y - pointer.y) * 2) ** 2;
          if (d < best) {
            best = d;
            next = i;
          }
        });
      }
      if (next !== hovered) {
        hovered = next;
        onHover?.(next >= 0 ? places[next]!.slug : null);
      }
      draw(grid, timeMs / 1000);
    },
    staticFrame(grid) {
      draw(grid, null);
    },
  };
}

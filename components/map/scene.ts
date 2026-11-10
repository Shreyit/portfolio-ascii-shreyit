import type { AsciiGrid } from "@/components/ascii/engine/grid";
import { spectrum } from "@/components/ascii/engine/palette";
import type { AsciiScene, PointerInput } from "@/components/ascii/engine/scene";
import { MAP_COLS, MAP_ROWS, STATE_NAMES, project, stateRaster } from "./geo";

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
  work: 0.2,
};

const LAND = ". ";
const COMET_TAIL = "@%+:.";
const COMETS_PER_FLOW = 3;
const FLOW_SECONDS = 3.2;
/** Pointer distance (cells) that counts as hovering a marker. */
const HIT = 3;

interface Flow {
  to: number; // index into places
  cells: { x: number; y: number }[];
}

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Cells along a curved arc (quadratic Bézier bowed to one side). */
function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = (b.y - a.y) * 2; // cells are twice as tall
  const len = Math.hypot(dx, dy);
  // Bow perpendicular to the chord, a fifth of its length.
  const cx = mx - (dy / len) * len * 0.2;
  const cy = my + ((dx / len) * len * 0.2) / 2;
  const cells: { x: number; y: number }[] = [];
  const steps = Math.max(8, Math.ceil(len * 1.5));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    const x = Math.round(u * u * a.x + 2 * u * t * cx + t * t * b.x);
    const y = Math.round(u * u * a.y + 2 * u * t * cy + t * t * b.y);
    const last = cells[cells.length - 1];
    if (!last || last.x !== x || last.y !== y) cells.push({ x, y });
  }
  return cells;
}

export interface MapScene extends AsciiScene {
  /** Highlight one place (and its journey), or none. */
  setActive(slug: string | null): void;
  /** The place under the pointer, if any. */
  readonly hovered: string | null;
}

/**
 * India as characters: states as faint dotted fields with brighter borders,
 * the states I have lived and worked in lit in their own hue, and journeys
 * drawn as curved flows with comets travelling from origin to destination.
 */
export function createMapScene(
  places: readonly MapPlace[],
  onHover?: (slug: string | null) => void,
): MapScene {
  const raster = stateRaster();
  const points = places.map((p) => {
    const { x, y } = project(p.lon, p.lat);
    return { x: Math.round(x), y: Math.round(y) };
  });
  const litStates = new Map<number, number>(); // state index → place index
  places.forEach((p, i) => {
    const s = STATE_NAMES.indexOf(p.state);
    if (s >= 0 && !litStates.has(s)) litStates.set(s, i);
  });
  const flows: Flow[] = [];
  places.forEach((p, i) => {
    const from = places.findIndex((q) => q.slug === p.from);
    if (from >= 0) flows.push({ to: i, cells: arc(points[from]!, points[i]!) });
  });

  let active: number = -1;
  let hovered: number = -1;

  const base = (grid: AsciiGrid, t: number) => {
    const focus = hovered >= 0 ? hovered : active;
    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < MAP_COLS; x += 1) {
        const s = raster[y * MAP_COLS + x]!;
        if (s < 0) {
          // Sea: a sparse, slowly drifting swell.
          const swell = Math.sin(x * 0.35 + y * 0.8 - t * 0.8) + hash(x, y);
          grid.set(x, y, swell > 1.85 ? "~" : " ", spectrum(0, 0.2));
          continue;
        }
        const right = x + 1 < MAP_COLS ? raster[y * MAP_COLS + x + 1]! : -1;
        const down = y + 1 < MAP_ROWS ? raster[(y + 1) * MAP_COLS + x]! : -1;
        const left = x > 0 ? raster[y * MAP_COLS + x - 1]! : -1;
        const up = y > 0 ? raster[(y - 1) * MAP_COLS + x]! : -1;
        const coast = right < 0 || down < 0 || left < 0 || up < 0;
        const border = !coast && (right !== s || down !== s);
        const lit = litStates.get(s);
        if (lit !== undefined) {
          const hue = KIND_HUE[places[lit]!.kind];
          const on = focus === lit;
          const pulse = on ? 0.15 + 0.1 * Math.sin(t * 4 + x * 0.3) : 0;
          const ch = border || coast ? "#" : hash(x, y) > 0.5 ? "+" : "=";
          grid.set(x, y, ch, spectrum(hue, 0.5 + pulse + (border ? 0.15 : 0)));
        } else if (coast) {
          grid.set(x, y, "#", spectrum(0.15, 0.42));
        } else if (border) {
          grid.set(x, y, ":", spectrum(0.25, 0.3));
        } else {
          grid.set(x, y, LAND[hash(x, y) > 0.7 ? 1 : 0]!, spectrum(0.1, 0.17));
        }
      }
    }
  };

  const drawFlows = (grid: AsciiGrid, t: number | null) => {
    const focus = hovered >= 0 ? hovered : active;
    for (const flow of flows) {
      const hue = KIND_HUE[places[flow.to]!.kind];
      const dim = focus >= 0 && focus !== flow.to;
      const n = flow.cells.length;
      for (const c of flow.cells) {
        grid.set(c.x, c.y, "*", spectrum(hue, dim ? 0.2 : 0.45));
      }
      if (t === null || dim) continue;
      for (let k = 0; k < COMETS_PER_FLOW; k += 1) {
        const phase = (t / FLOW_SECONDS + k / COMETS_PER_FLOW) % 1;
        const head = Math.floor(phase * n);
        for (let j = 0; j < COMET_TAIL.length; j += 1) {
          const c = flow.cells[head - j];
          if (!c) break;
          grid.set(c.x, c.y, COMET_TAIL[j]!, spectrum(hue, 0.999 - j * 0.16));
        }
      }
    }
  };

  const drawMarkers = (grid: AsciiGrid, t: number | null) => {
    places.forEach((place, i) => {
      const { x, y } = points[i]!;
      const on = i === hovered || i === active;
      if (on && t !== null) {
        // Expanding ring around the focused marker.
        const r = 1 + ((t * 2) % 1) * 2;
        for (let a = 0; a < 12; a += 1) {
          const ang = (a / 12) * Math.PI * 2;
          grid.set(
            Math.round(x + Math.cos(ang) * r * 1.6),
            Math.round(y + Math.sin(ang) * r * 0.8),
            "o",
            spectrum(KIND_HUE[place.kind], 0.9 - (r - 1) * 0.3),
          );
        }
      }
      grid.set(x, y, place.kind === "home" ? "&" : "@", on ? ACCENT : FG);
      const label = place.name.toUpperCase();
      const lx = place.label === "right" ? x + 2 : x - 1 - label.length;
      grid.writeText(lx, y, label, on ? ACCENT : FG);
    });
  };

  const draw = (grid: AsciiGrid, t: number | null) => {
    base(grid, t ?? 0);
    drawFlows(grid, t);
    drawMarkers(grid, t);
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

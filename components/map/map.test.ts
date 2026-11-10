import { describe, expect, it } from "vitest";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { MAP_COLS, MAP_ROWS, STATE_NAMES, project, stateRaster } from "./geo";
import { createMapScene, type MapPlace } from "./scene";

const PLACES: MapPlace[] = [
  {
    slug: "patna",
    name: "Patna",
    state: "Bihar",
    lon: 85.14,
    lat: 25.59,
    kind: "home",
    from: null,
    label: "right",
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    lon: 72.88,
    lat: 19.08,
    kind: "study",
    from: "patna",
    label: "left",
  },
  {
    slug: "nainital",
    name: "Nainital",
    state: "Uttarakhand",
    lon: 79.46,
    lat: 29.38,
    kind: "fieldwork",
    from: "mumbai",
    label: "right",
  },
];

describe("india map", () => {
  it("rasterises states and places cities inside them", () => {
    const raster = stateRaster();
    const land = raster.filter((s) => s >= 0).length;
    expect(land / raster.length).toBeGreaterThan(0.3);
    for (const p of PLACES) {
      const { x, y } = project(p.lon, p.lat);
      const s = raster[Math.floor(y) * MAP_COLS + Math.floor(x)]!;
      expect(STATE_NAMES[s]).toBe(p.state);
    }
  });

  it("draws markers, labels and flows; hover reports the place", () => {
    const hovered: (string | null)[] = [];
    const scene = createMapScene(PLACES, (slug) => hovered.push(slug));
    const grid = new AsciiGrid(MAP_COLS, MAP_ROWS);
    scene.staticFrame(grid);
    const text = grid.toPlainText();
    if (process.env.PRINT_SCENE) console.log(text);
    expect(text).toContain("PATNA");
    expect(text).toContain("MUMBAI");
    expect(text).toContain("&"); // home marker

    const m = project(72.88, 19.08);
    scene.update(grid, 1000, 33, { x: m.x, y: m.y, active: true });
    expect(scene.hovered).toBe("mumbai");
    scene.update(grid, 1033, 33, { x: 0, y: 0, active: false });
    expect(hovered).toEqual(["mumbai", null]);
  });
});

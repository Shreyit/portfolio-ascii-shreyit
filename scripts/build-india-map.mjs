#!/usr/bin/env node
// Builds content/generated/india-map.json from the DataMeet India state
// boundaries shapefile (CC BY 4.0, https://github.com/datameet/maps).
//
//   mkdir -p data/raw/india-states && cd data/raw/india-states
//   for e in shp shx dbf prj; do
//     curl -sSLO "https://raw.githubusercontent.com/datameet/maps/master/States/Admin2.$e"
//   done
//   node scripts/build-india-map.mjs
//
// The shapefile (17 MB) stays out of git; only the simplified output is
// committed. Coordinates are WGS84 lon/lat, simplified with Douglas-Peucker.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "data/raw/india-states/Admin2";
const OUT = "content/generated/india-map.json";
const TOLERANCE = 0.04; // degrees
const MIN_RING_AREA = 0.02; // square degrees: drops specks, keeps big islands

function readDbfNames(buffer) {
  const records = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = [];
  for (let off = 32; buffer[off] !== 0x0d; off += 32) {
    const name = buffer
      .toString("latin1", off, off + 11)
      .replace(/\0.*$/, "")
      .trim();
    fields.push({ name, length: buffer[off + 16] });
  }
  const names = [];
  for (let r = 0; r < records; r += 1) {
    let off = headerLength + r * recordLength + 1;
    const row = {};
    for (const field of fields) {
      row[field.name] = buffer.toString("utf8", off, off + field.length).trim();
      off += field.length;
    }
    names.push(row.ST_NM ?? row.NAME_1 ?? Object.values(row)[0]);
  }
  return names;
}

function readPolygons(buffer) {
  const shapes = [];
  let off = 100;
  while (off < buffer.length) {
    const contentLength = buffer.readUInt32BE(off + 4) * 2;
    const body = off + 8;
    const type = buffer.readInt32LE(body);
    const rings = [];
    if (type === 5) {
      const numParts = buffer.readInt32LE(body + 36);
      const numPoints = buffer.readInt32LE(body + 40);
      const parts = [];
      for (let i = 0; i < numParts; i += 1) {
        parts.push(buffer.readInt32LE(body + 44 + i * 4));
      }
      const pts = body + 44 + numParts * 4;
      for (let p = 0; p < numParts; p += 1) {
        const end = p + 1 < numParts ? parts[p + 1] : numPoints;
        const ring = [];
        for (let i = parts[p]; i < end; i += 1) {
          ring.push([
            buffer.readDoubleLE(pts + i * 16),
            buffer.readDoubleLE(pts + i * 16 + 8),
          ]);
        }
        rings.push(ring);
      }
    }
    shapes.push(rings);
    off = body + contentLength;
  }
  return shapes;
}

function area(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return Math.abs(a) / 2;
}

function simplify(points, tolerance) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let max = 0;
    let index = -1;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = points[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (max > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// A closed ring starts and ends on the same point, so split it at the
// vertex farthest from the start and simplify the two halves.
function simplifyRing(ring, tolerance) {
  const [sx, sy] = ring[0];
  let far = 0;
  let best = -1;
  ring.forEach(([x, y], i) => {
    const d = (x - sx) ** 2 + (y - sy) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  });
  const a = simplify(ring.slice(0, far + 1), tolerance);
  const b = simplify(ring.slice(far), tolerance);
  return [...a, ...b.slice(1)];
}

const names = readDbfNames(readFileSync(`${SRC}.dbf`));
const shapes = readPolygons(readFileSync(`${SRC}.shp`));

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
const states = shapes
  .map((rings, i) => ({
    name: names[i],
    rings: rings
      .filter((ring) => area(ring) >= MIN_RING_AREA)
      .map((ring) => simplifyRing(ring, TOLERANCE))
      .filter((ring) => ring.length >= 4)
      .map((ring) =>
        ring.map(([x, y]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
        }),
      ),
  }))
  .filter((state) => state.rings.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const output = {
  source:
    "DataMeet India state boundaries (CC BY 4.0) — https://github.com/datameet/maps",
  bbox: [minX, minY, maxX, maxY].map((v) => Math.round(v * 100) / 100),
  states,
};
writeFileSync(join(process.cwd(), OUT), JSON.stringify(output) + "\n");
const points = states.reduce(
  (n, s) => n + s.rings.reduce((m, r) => m + r.length, 0),
  0,
);
console.log(
  `${OUT}: ${states.length} states, ${points} points, ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`,
);

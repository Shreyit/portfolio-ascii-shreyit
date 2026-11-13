#!/usr/bin/env node
// Turns the luminance grid from scripts/build-og-portrait.mjs
// (content/generated/og-portrait.json) into the braille portrait the hero
// draws (content/generated/portrait.json), so the site and the link
// preview share one photo. Run build-og-portrait.mjs first.
//   node scripts/build-portrait-braille.mjs [cols=124]
//
// Each braille dot samples the grid; tone is the photo's own brightness,
// half histogram-equalised so the narrow band of skin tones (glasses,
// beard, ear) separates, then ordered-dithered into dots. The brightest
// tones are capped so a white shirt dithers instead of filling solid.
import { readFileSync, writeFileSync } from "node:fs";

const src = JSON.parse(
  readFileSync("content/generated/og-portrait.json", "utf8"),
);
const cols = Number(process.argv[2] ?? 124);
// Source cells and braille cells are both 1:2, so keep the cell ratio.
const rows = Math.round((cols * src.rows) / src.cols);
const dotsW = cols * 2;
const dotsH = rows * 4;

const counts = new Array(10).fill(0);
for (const line of src.lines)
  for (const d of line) if (d !== " ") counts[Number(d)] += 1;
const total = counts.reduce((a, b) => a + b, 0);
let run = 0;
const cdf = counts.map((c) => (run += c) / total);
const tone = (d) => Math.max(0.1, Math.min(0.82, 0.5 * (d / 9) + 0.5 * cdf[d]));

// 4×4 Bayer matrix, thresholds in (0, 1).
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));
const BIT = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];

const lines = [];
for (let cy = 0; cy < rows; cy += 1) {
  let line = "";
  for (let cx = 0; cx < cols; cx += 1) {
    let bits = 0;
    for (let sx = 0; sx < 2; sx += 1) {
      for (let sy = 0; sy < 4; sy += 1) {
        const dx = cx * 2 + sx;
        const dy = cy * 4 + sy;
        const gx = Math.min(src.cols - 1, Math.floor((dx / dotsW) * src.cols));
        const gy = Math.min(src.rows - 1, Math.floor((dy / dotsH) * src.rows));
        const d = src.lines[gy][gx];
        if (d === " ") continue;
        if (tone(Number(d)) > BAYER[dy % 4][dx % 4]) bits |= BIT[sx][sy];
      }
    }
    line += String.fromCodePoint(0x2800 + bits);
  }
  lines.push(line);
}

writeFileSync(
  "content/generated/portrait.json",
  JSON.stringify({ cols, rows, lines }, null, 1) + "\n",
);
console.log(`portrait: ${cols}x${rows}`);

#!/usr/bin/env node
// Imports a colour ASCII portrait (the HTML export of an image-to-ASCII
// converter: one <span style="color:#rrggbb"> per run) into
// content/generated/og-portrait.json for the link preview (the hero uses
// scripts/build-portrait-ascii.mjs). The background is keyed out by the
// top-left cell's colour: a green screen (any strong green), or a flat
// backdrop (colours within a few steps of it, e.g. #121212 black). Each
// cell keeps its luminance (0-9, " " for background) and its natural colour,
// reduced to a small palette; the source photo is never committed.
//   node scripts/build-og-portrait.mjs ~/Downloads/ascii-art.html [keep=0.8]
// `keep` is the share of rows kept from the top (crops the bottom).
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("usage: build-og-portrait.mjs <ascii.html>");
const html = readFileSync(src, "utf8");
const pre = /<pre[^>]*>([\s\S]*)<\/pre>/.exec(html)?.[1];
if (!pre) throw new Error("no <pre> block found");

const span = /<span style="color:#([0-9a-fA-F]{6})">([^<]*)<\/span>/g;
const rgbOf = (hex) => {
  const n = parseInt(hex, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
// Only a strong, saturated green is screen: pale greens (the tint in a pair
// of glasses, say) stay part of the figure.
const isGreen = ([r, g, b]) => g > 150 && g - Math.max(r, b) > 70;
const firstHex = /color:#([0-9a-fA-F]{6})/.exec(pre)?.[1] ?? "ffffff";
const greenScreen = isGreen(rgbOf(firstHex));
const key = rgbOf(firstHex);
const isBackground = (rgb) =>
  greenScreen ? isGreen(rgb) : rgb.every((v, i) => Math.abs(v - key[i]) <= 8);
// Brightness comes from the character: the converter colours a whole run by
// its first character, so trailing spaces (the darkest tone) carry a
// neighbour's colour. Those cells get a dark hair brown instead.
const RAMP = " .:-=+*#%@";
const DARKEST = [43, 29, 24];
const decode = (text) => [
  ...text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
];

/** Per row: [{ level: 0-9 | null, rgb }] */
let rows = pre
  .split("\n")
  .map((line) => {
    const row = [];
    for (const [, hex, text] of line.matchAll(span)) {
      const rgb = rgbOf(hex);
      const bg = isBackground(rgb);
      for (const ch of decode(text)) {
        const i = RAMP.indexOf(ch);
        const level = i < 0 ? 5 : i;
        row.push(
          bg ? { level: null } : { level, rgb: level === 0 ? DARKEST : rgb },
        );
      }
    }
    return row;
  })
  .filter((r) => r.length);

const filled = (r) => r.some((c) => c.level !== null);
while (rows.length && !filled(rows[0])) rows.shift();
while (rows.length && !filled(rows.at(-1))) rows.pop();
const width = Math.max(...rows.map((r) => r.length));
for (const r of rows) while (r.length < width) r.push({ level: null });
let left = width;
let right = 0;
for (const r of rows) {
  const first = r.findIndex((c) => c.level !== null);
  if (first >= 0) left = Math.min(left, first);
  for (let i = r.length - 1; i >= 0; i -= 1)
    if (r[i].level !== null) {
      right = Math.max(right, i);
      break;
    }
}
const keep = Number(process.argv[3] ?? 1);
const kept = rows
  .slice(0, Math.round(rows.length * keep))
  .map((r) => r.slice(left, right + 1));

// Reduce the natural colours to a small palette (k-means, k-means++ style
// seeding by farthest point, so rare but distinct colours such as a green
// tint in glasses get their own entry instead of being averaged away).
const K = 48;
const cells = kept.flat().filter((c) => c.level !== null);
const dist = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const centres = [cells[0].rgb];
const best = cells.map((c) => dist(c.rgb, centres[0]));
while (centres.length < K) {
  let far = 0;
  for (let i = 1; i < cells.length; i += 1) if (best[i] > best[far]) far = i;
  centres.push(cells[far].rgb);
  cells.forEach((c, i) => {
    best[i] = Math.min(best[i], dist(c.rgb, cells[far].rgb));
  });
}
const nearest = (rgb) => {
  let k = 0;
  for (let j = 1; j < centres.length; j += 1)
    if (dist(rgb, centres[j]) < dist(rgb, centres[k])) k = j;
  return k;
};
for (let iter = 0; iter < 12; iter += 1) {
  const sum = centres.map(() => [0, 0, 0, 0]);
  for (const c of cells) {
    const s = sum[nearest(c.rgb)];
    s[0] += c.rgb[0];
    s[1] += c.rgb[1];
    s[2] += c.rgb[2];
    s[3] += 1;
  }
  sum.forEach((s, j) => {
    if (s[3]) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
  });
}
const hex = (rgb) =>
  "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
// One character per palette index.
const TINT = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

const out = {
  cols: right - left + 1,
  rows: kept.length,
  lines: kept.map((r) =>
    r.map((c) => (c.level === null ? " " : String(c.level))).join(""),
  ),
  palette: centres.map(hex),
  tints: kept.map((r) =>
    r.map((c) => (c.level === null ? " " : TINT[nearest(c.rgb)])).join(""),
  ),
};
writeFileSync(
  "content/generated/og-portrait.json",
  JSON.stringify(out, null, 1) + "\n",
);
console.log(`og-portrait: ${out.cols}×${out.rows}, ${K} colours`);

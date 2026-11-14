#!/usr/bin/env node
// Imports a coloured ASCII-art portrait, as exported to HTML by an
// image-to-ASCII converter (a <pre> of <span style="color:#rrggbb">
// characters), into content/generated/portrait.json. The characters are kept
// as drawn, each with the photo's natural colour (from a small palette);
// the backdrop is keyed out.
// The source photo is never committed.
//   node scripts/build-portrait-ascii.mjs ~/Downloads/ascii-art.html [step=1] [keep=0.8]
// `step` keeps every nth column and row, and may be fractional (the export is
// usually denser than the hero needs; the converter's 1:2 cells keep their
// shape). `keep` is the share of rows kept from the top (crops the bottom,
// which the hero fades out anyway).
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src)
  throw new Error("usage: build-portrait-ascii.mjs <ascii.html> [step]");
const step = Math.max(1, Number(process.argv[3] ?? 1));
const keep = Number(process.argv[4] ?? 0.8);

const html = readFileSync(src, "utf8");
const pre = html.slice(html.indexOf("<pre"), html.indexOf("</pre>"));
const body = pre.slice(pre.indexOf(">") + 1);
const unescape = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Rows of { ch, rgb } (rgb null for uncoloured text, i.e. blanks). */
const rows = [[]];
const token = /<span style="color:(#[0-9a-fA-F]{6})">([^<]*)<\/span>|([^<]+)/g;
for (const m of body.matchAll(token)) {
  const rgb = m[1] ? parseInt(m[1].slice(1), 16) : null;
  for (const ch of unescape(m[1] ? m[2] : m[3])) {
    if (ch === "\n") rows.push([]);
    else rows.at(-1).push({ ch, rgb });
  }
}

// The backdrop is keyed out by the top-left cell's colour: a green screen
// (any strong green; pale greens such as a tint in glasses stay), or a flat
// backdrop (colours within a few steps of it, e.g. #121212 black).
const isGreen = (n) => {
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return g > 150 && g - Math.max(r, b) > 70;
};
const keyRgb = rows.flat().find((c) => c.rgb !== null)?.rgb ?? 0;
const greenScreen = isGreen(keyRgb);
const isBackdrop = (n) =>
  greenScreen
    ? isGreen(n)
    : [16, 8, 0].every(
        (s) => Math.abs(((n >> s) & 255) - ((keyRgb >> s) & 255)) <= 8,
      );
const ink = (c) => c && c.ch !== " " && c.rgb !== null && !isBackdrop(c.rgb);
const sampled = [];
const width = Math.max(...rows.map((r) => r.length));
for (let y = 0; y < rows.length; y += step) {
  const row = [];
  for (let x = 0; x < width; x += step)
    row.push(rows[Math.floor(y)][Math.floor(x)]);
  sampled.push(row);
}

// Trim blank margins.
while (sampled.length && !sampled[0].some(ink)) sampled.shift();
while (sampled.length && !sampled.at(-1).some(ink)) sampled.pop();
sampled.length = Math.round(sampled.length * keep);
let left = Infinity;
let right = -1;
for (const r of sampled)
  r.forEach((c, x) => {
    if (ink(c)) {
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  });

// Each cell keeps the photo's own colour, reduced to a small palette
// (k-means, seeded by farthest point so rare colours such as the green tint
// in a pair of glasses keep their own entry). Dark colours (hair, glasses
// frames, the phone) are lifted so they still read on the near-black page.
const rgbOf = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const cells = [];
for (const r of sampled)
  for (let x = left; x <= right; x += 1)
    if (ink(r[x])) cells.push(rgbOf(r[x].rgb));
const K = 32;
const dist = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const centres = [cells[0]];
const best = cells.map((c) => dist(c, centres[0]));
while (centres.length < K) {
  let far = 0;
  for (let i = 1; i < cells.length; i += 1) if (best[i] > best[far]) far = i;
  centres.push(cells[far]);
  cells.forEach((c, i) => {
    best[i] = Math.min(best[i], dist(c, cells[far]));
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
    const s = sum[nearest(c)];
    s[0] += c[0];
    s[1] += c[1];
    s[2] += c[2];
    s[3] += 1;
  }
  sum.forEach((s, j) => {
    if (s[3]) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
  });
}
const MIN_LUMA = 0.34;
const lift = ([r, g, b]) => {
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const k = l < MIN_LUMA ? MIN_LUMA / Math.max(l, 0.02) : 1;
  return [r * k, g * k, b * k].map((v) => Math.min(255, Math.round(v)));
};
const hex = (rgb) =>
  "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
// One character per palette index.
const TINT = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

const lines = [];
const tints = [];
for (const r of sampled) {
  let line = "";
  let tint = "";
  for (let x = left; x <= right; x += 1) {
    const c = r[x];
    if (!ink(c)) {
      line += " ";
      tint += " ";
      continue;
    }
    line += c.ch;
    tint += TINT[nearest(rgbOf(c.rgb))];
  }
  lines.push(line);
  tints.push(tint);
}

const cols = right - left + 1;
writeFileSync(
  "content/generated/portrait.json",
  JSON.stringify(
    {
      cols,
      rows: lines.length,
      lines,
      palette: centres.map((c) => hex(lift(c))),
      tints,
    },
    null,
    1,
  ) + "\n",
);
console.log(`portrait: ${cols}x${lines.length} (step ${step}), ${K} colours`);

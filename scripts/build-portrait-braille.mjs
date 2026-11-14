#!/usr/bin/env node
// Turns the luminance grid from scripts/build-og-portrait.mjs
// (content/generated/og-portrait.json) into the braille portrait the hero
// draws (content/generated/portrait.json) plus each cell's natural colour
// (content/generated/portrait-tints.json), so the site and the link preview
// share one photo. Run build-og-portrait.mjs first.
//   node scripts/build-portrait-braille.mjs [cols=124]
//
// Each braille dot samples the grid. Brightness goes through a contrast
// curve (TONE) and is error-diffused into dots (Floyd–Steinberg), which
// keeps edges such as the glasses, beard and jaw sharp where an ordered
// pattern would blur every tone into the same texture.
import { readFileSync, writeFileSync } from "node:fs";

const src = JSON.parse(
  readFileSync("content/generated/og-portrait.json", "utf8"),
);
const cols = Number(process.argv[2] ?? 124);
// Source cells and braille cells are both 1:2, so keep the cell ratio.
const rows = Math.round((cols * src.rows) / src.cols);
const dotsW = cols * 2;
const dotsH = rows * 4;

// Dot density per source level 0-9 (dark → light). Pure white, in practice
// the shirt, is held back so the face is the brightest part of the figure;
// the black hair keeps a sparse texture rather than vanishing.
const TONE = [0.08, 0.14, 0.2, 0.28, 0.38, 0.5, 0.62, 0.75, 0.88, 0.36];

// Target density per dot; NaN outside the figure (never lit, takes no error).
const grid = new Float32Array(dotsW * dotsH);
for (let dy = 0; dy < dotsH; dy += 1) {
  for (let dx = 0; dx < dotsW; dx += 1) {
    const gx = Math.min(src.cols - 1, Math.floor((dx / dotsW) * src.cols));
    const gy = Math.min(src.rows - 1, Math.floor((dy / dotsH) * src.rows));
    const d = src.lines[gy][gx];
    grid[dy * dotsW + dx] = d === " " ? NaN : TONE[Number(d)];
  }
}

// Serpentine Floyd–Steinberg.
const on = new Uint8Array(dotsW * dotsH);
const spread = (x, y, e) => {
  if (x < 0 || x >= dotsW || y >= dotsH) return;
  const i = y * dotsW + x;
  if (!Number.isNaN(grid[i])) grid[i] += e;
};
for (let y = 0; y < dotsH; y += 1) {
  const ltr = y % 2 === 0;
  for (let k = 0; k < dotsW; k += 1) {
    const x = ltr ? k : dotsW - 1 - k;
    const i = y * dotsW + x;
    const v = grid[i];
    if (Number.isNaN(v)) continue;
    const lit = v > 0.5 ? 1 : 0;
    on[i] = lit;
    const e = v - lit;
    const f = ltr ? 1 : -1;
    spread(x + f, y, (e * 7) / 16);
    spread(x - f, y + 1, (e * 3) / 16);
    spread(x, y + 1, (e * 5) / 16);
    spread(x + f, y + 1, (e * 1) / 16);
  }
}

const BIT = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];
const lines = [];
for (let cy = 0; cy < rows; cy += 1) {
  let line = "";
  for (let cx = 0; cx < cols; cx += 1) {
    let bits = 0;
    for (let sx = 0; sx < 2; sx += 1)
      for (let sy = 0; sy < 4; sy += 1)
        if (on[(cy * 4 + sy) * dotsW + cx * 2 + sx]) bits |= BIT[sx][sy];
    line += String.fromCodePoint(0x2800 + bits);
  }
  lines.push(line);
}

// Natural colour per braille cell: the average of the figure's source cells
// under it, snapped to the photo palette. Very dark colours (the hair) are
// lifted so they still read on the near-black page.
const T = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
const pal = src.palette.map((h) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)),
);
const MIN_LUMA = 0.3;
// Near-white, colourless tones (the shirt) are softened to a grey so the
// face, not the shirt, is the brightest part.
const lift = ([r, g, b]) => {
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1);
  const k =
    l < MIN_LUMA
      ? MIN_LUMA / Math.max(l, 0.02)
      : l > 0.85 && sat < 0.12
        ? 0.68
        : 1;
  return [r * k, g * k, b * k].map((v) => Math.min(255, Math.round(v)));
};
const hex = (rgb) =>
  "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
const near = (rgb) => {
  let k = 0;
  let best = Infinity;
  pal.forEach((p, j) => {
    const d =
      (p[0] - rgb[0]) ** 2 + (p[1] - rgb[1]) ** 2 + (p[2] - rgb[2]) ** 2;
    if (d < best) {
      best = d;
      k = j;
    }
  });
  return k;
};
const tints = [];
for (let cy = 0; cy < rows; cy += 1) {
  let line = "";
  for (let cx = 0; cx < cols; cx += 1) {
    const sum = [0, 0, 0];
    let n = 0;
    for (let dy = cy * 4; dy < cy * 4 + 4; dy += 1) {
      for (let dx = cx * 2; dx < cx * 2 + 2; dx += 1) {
        const gx = Math.min(src.cols - 1, Math.floor((dx / dotsW) * src.cols));
        const gy = Math.min(src.rows - 1, Math.floor((dy / dotsH) * src.rows));
        const t = src.tints[gy][gx];
        if (t === " ") continue;
        const c = pal[T.indexOf(t)];
        sum[0] += c[0];
        sum[1] += c[1];
        sum[2] += c[2];
        n += 1;
      }
    }
    line += n ? T[near(sum.map((v) => v / n))] : " ";
  }
  tints.push(line);
}
writeFileSync(
  "content/generated/portrait-tints.json",
  JSON.stringify({ palette: pal.map((c) => hex(lift(c))), tints }, null, 1) +
    "\n",
);

writeFileSync(
  "content/generated/portrait.json",
  JSON.stringify({ cols, rows, lines }, null, 1) + "\n",
);
console.log(`portrait: ${cols}x${rows}`);

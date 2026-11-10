#!/usr/bin/env node
// Renders the hero name in a heavy face with headless Chromium and samples
// per-cell ink coverage (0-9) into content/generated/name-mask.json, so the
// ASCII hero gets smooth, anti-aliased letterforms on the server and client
// without shipping a font rasteriser. Re-run after changing LINES or COLS:
//   node scripts/build-name-mask.mjs
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const LINES = ["SHREYIT", "SINHA"];
const COLS = 124;
const CELL = 8; // px per column; rows are twice as tall (glyph aspect)
const OUT = "content/generated/name-mask.json";

const browser = await chromium.launch();
const page = await browser.newPage();
const mask = await page.evaluate(
  ({ lines, cols, cell }) => {
    const width = cols * cell;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const family = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
    // Size the longest line to fill the width.
    ctx.font = `900 100px ${family}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const size = Math.floor((100 * width * 0.98) / widest);
    ctx.font = `900 ${size}px ${family}`;
    const m = ctx.measureText(lines[0]);
    const ascent = m.actualBoundingBoxAscent;
    const lineGap = Math.round(size * 0.22);
    const lineH = Math.ceil(ascent) + lineGap;
    const pad = cell * 2;
    const height =
      Math.ceil((pad * 2 + lineH * lines.length - lineGap) / (cell * 2)) *
      cell *
      2;
    canvas.width = width;
    canvas.height = height;
    ctx.font = `900 ${size}px ${family}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    lines.forEach((line, i) =>
      ctx.fillText(line, width / 2, pad + ascent + i * lineH),
    );
    const { data } = ctx.getImageData(0, 0, width, height);
    const rows = height / (cell * 2);
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      let row = "";
      for (let c = 0; c < cols; c += 1) {
        let sum = 0;
        for (let y = 0; y < cell * 2; y += 1) {
          for (let x = 0; x < cell; x += 1) {
            sum += data[((r * cell * 2 + y) * width + c * cell + x) * 4 + 3];
          }
        }
        row += Math.round((sum / (cell * cell * 2 * 255)) * 9);
      }
      out.push(row);
    }
    return out;
  },
  { lines: LINES, cols: COLS, cell: CELL },
);
await browser.close();

// Trim blank rows top and bottom, keep one row of air.
while (mask.length > 2 && /^0+$/.test(mask[1])) mask.shift();
while (mask.length > 2 && /^0+$/.test(mask[mask.length - 2])) mask.pop();
writeFileSync(
  OUT,
  JSON.stringify(
    { lines: LINES, cols: COLS, rows: mask.length, mask },
    null,
    1,
  ) + "\n",
);
console.log(`${OUT}: ${COLS}x${mask.length}`);
for (const row of mask)
  console.log(
    row
      .replace(/0/g, " ")
      .replace(/[1-3]/g, ".")
      .replace(/[4-6]/g, "+")
      .replace(/[7-9]/g, "#"),
  );

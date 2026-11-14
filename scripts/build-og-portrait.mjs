#!/usr/bin/env node
// Imports a colour ASCII portrait (the HTML export of an image-to-ASCII
// converter: one <span style="color:#rrggbb"> per run; the darkest cells are
// bare spaces outside any span) into content/generated/og-portrait.json.
// The background is keyed out by colour: a green screen if the top-left
// cell is green, otherwise pure white. Each cell keeps only its luminance
// (0-9, " " for background); the source photo is never committed.
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
const isGreen = ([r, g, b]) => g > 150 && g - Math.max(r, b) > 70;
const firstHex = /color:#([0-9a-fA-F]{6})/.exec(pre)?.[1] ?? "ffffff";
const greenScreen = isGreen(rgbOf(firstHex));
const isBackground = (rgb) =>
  greenScreen ? isGreen(rgb) : rgb.every((v) => v === 255);
// Brightness comes from the character, not the colour: the converter colours
// a whole run by its first character, so trailing spaces (the darkest tone)
// carry a neighbour's colour. The colour is only used to key the background.
const RAMP = " .:-=+*#%@";
const decode = (text) => [
  ...text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
];

let rows = pre
  .split("\n")
  .map((line) => {
    let row = "";
    for (const [, hex, text] of line.matchAll(span)) {
      const bg = isBackground(rgbOf(hex));
      for (const ch of decode(text)) {
        const i = RAMP.indexOf(ch);
        row += bg ? " " : String(i < 0 ? 5 : i);
      }
    }
    return row;
  })
  .filter((r) => r.length);

const filled = (r) => /\S/.test(r);
while (rows.length && !filled(rows[0])) rows.shift();
while (rows.length && !filled(rows.at(-1))) rows.pop();
const width = Math.max(...rows.map((r) => r.length));
rows = rows.map((r) => r.padEnd(width));
let left = width;
let right = 0;
for (const r of rows) {
  const m = /\S/.exec(r);
  if (m) left = Math.min(left, m.index);
  const e = r.search(/\s*$/);
  if (filled(r)) right = Math.max(right, e - 1);
}
const keep = Number(process.argv[3] ?? 1);
const kept = rows.slice(0, Math.round(rows.length * keep));
const out = kept.map((r) => r.slice(left, right + 1));
writeFileSync(
  "content/generated/og-portrait.json",
  JSON.stringify(
    { cols: right - left + 1, rows: out.length, lines: out },
    null,
    1,
  ) + "\n",
);
console.log(`og-portrait: ${right - left + 1}×${out.length}`);

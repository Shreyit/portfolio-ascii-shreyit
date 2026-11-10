#!/usr/bin/env node
// Imports a braille ASCII portrait (as exported by an image-to-ASCII
// converter, ANSI colours allowed) into content/generated/portrait.json,
// trimming blank margins. The source photo is never committed.
//   node scripts/build-portrait.mjs ~/Downloads/ascii-art.txt
import { readFileSync, writeFileSync } from "node:fs";

const BLANK = "⠀";
const src = process.argv[2];
if (!src) throw new Error("usage: build-portrait.mjs <ascii.txt>");
const lines = readFileSync(src, "utf8")
  .replace(/\x1b\[[0-9;]*m/g, "")
  .split("\n")
  .map((l) => [...l.replace(/\s+$/, "")].map((c) => (c === " " ? BLANK : c)));
const ink = (row) => row.some((c) => c !== BLANK);
while (lines.length && !ink(lines[0])) lines.shift();
while (lines.length && !ink(lines[lines.length - 1])) lines.pop();
const width = Math.max(...lines.map((r) => r.length));
for (const r of lines) while (r.length < width) r.push(BLANK);
let left = width;
let right = 0;
for (const r of lines) {
  const first = r.findIndex((c) => c !== BLANK);
  if (first >= 0) left = Math.min(left, first);
  for (let i = r.length - 1; i >= 0; i -= 1)
    if (r[i] !== BLANK) {
      right = Math.max(right, i);
      break;
    }
}
const out = lines.map((r) => r.slice(left, right + 1).join(""));
writeFileSync(
  "content/generated/portrait.json",
  JSON.stringify({ cols: right - left + 1, rows: out.length, lines: out }, null, 1) + "\n",
);
console.log(`portrait: ${right - left + 1}x${out.length}`);

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import portrait from "@/content/generated/portrait.json";
import nameMask from "@/content/generated/name-mask.json";

// The link preview (LinkedIn, Slack, X…): the hero as a still. The braille
// portrait on the left, the name in the same glyph mask as the site, a
// dotted spectrum field behind. Rendered once at build time.

export const alt =
  "Shreyit Sinha — interactive ASCII portfolio: terminal, SQL playground, ML lab and fieldwork map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const W = size.width;
const H = size.height;
const BG = "#050507";
const FG = "#ededed";
const MUTED = "#8e8d99";
const ACCENT = "#b9a2ff";
// --spectrum-0..5 (app/globals.css): indigo → amber.
const STOPS = [
  "#3438a8",
  "#6a4fd8",
  "#a66ee8",
  "#d77bc0",
  "#f08f8a",
  "#f6b26b",
];

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
const BG_RGB = rgb(BG);
const STOP_RGB = STOPS.map(rgb);

/** Like engine/palette `spectrum`: hue 0..1 along the stops, level 0..1 from the background. */
function spectrum(hue: number, level: number): string {
  const h = Math.min(1, Math.max(0, hue)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(h));
  const f = h - i;
  const a = STOP_RGB[i]!;
  const b = STOP_RGB[i + 1]!;
  const l = Math.min(1, Math.max(0, level));
  const c = [0, 1, 2].map((k) => {
    const hueC = a[k]! + (b[k]! - a[k]!) * f;
    return Math.round(BG_RGB[k]! + (hueC - BG_RGB[k]!) * l);
  });
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise. */
function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(x - xi);
  const v = s(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const svg = (body: string, w = W, h = H) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`,
  )}`;

/** Groups rects by colour into one path each: far smaller than one element per dot. */
function paths(dots: Map<string, string[]>): string {
  let out = "";
  for (const [fill, d] of dots)
    out += `<path fill="${fill}" d="${d.join("")}"/>`;
  return out;
}
const add = (
  dots: Map<string, string[]>,
  fill: string,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const list = dots.get(fill) ?? [];
  list.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${w}v${h}h-${w}z`);
  dots.set(fill, list);
};

// Text column: everything right of the portrait.
const TEXT_X = 560;

function field(): string {
  const dots = new Map<string, string[]>();
  const pitch = 8;
  for (let y = 0; y < H; y += pitch) {
    for (let x = 0; x < W; x += pitch) {
      const nx = x / pitch;
      const ny = y / pitch;
      const cloud =
        noise(nx * 0.045 + noise(nx * 0.02, ny * 0.04) * 2, ny * 0.09) * 0.8 +
        noise(nx * 0.12, ny * 0.22) * 0.2;
      // Quiet behind the name and the portrait's face, like the site.
      const dx = (x - (TEXT_X + 300)) / 380;
      const dy = (y - 300) / 220;
      const quiet = 1 - 0.75 * Math.exp(-(dx * dx + dy * dy));
      let level = Math.max(0, cloud - 0.42) * 1.6 * quiet;
      if (level < 0.06) continue;
      level = Math.round(Math.min(0.55, level) * 12) / 12; // fewer colours
      const hue = Math.round(noise(nx * 0.01 + 3, ny * 0.02) * 1.1 * 10) / 10;
      add(dots, spectrum(hue, level), x, y, 2, 2);
    }
  }
  return svg(paths(dots));
}

/** Braille dots → rects, lavender like the site's portrait, fading out at the bottom. */
function portraitArt(width: number, height: number): string {
  const dots = new Map<string, string[]>();
  const cols = portrait.cols * 2;
  const rows = portrait.rows * 4;
  const px = width / cols;
  const py = height / rows;
  const BIT = [
    [0x01, 0x02, 0x04, 0x40],
    [0x08, 0x10, 0x20, 0x80],
  ];
  portrait.lines.forEach((line, cy) => {
    [...line].forEach((ch, cx) => {
      const bits = ch.codePointAt(0)! - 0x2800;
      if (bits <= 0) return;
      for (let sx = 0; sx < 2; sx += 1) {
        for (let sy = 0; sy < 4; sy += 1) {
          if (!(bits & BIT[sx]![sy]!)) continue;
          const row = cy * 4 + sy;
          const fade = Math.min(1, ((rows - row) / rows) * 4.5);
          const hue = Math.round((0.3 + (row / rows) * 0.35) * 20) / 20;
          const level = Math.round(0.95 * fade * 10) / 10;
          if (level <= 0) continue;
          add(
            dots,
            spectrum(hue, level),
            (cx * 2 + sx) * px,
            row * py,
            px * 0.72,
            py * 0.72,
          );
        }
      }
    });
  });
  return svg(paths(dots), width, height);
}

/** The hero name mask: one block per cell, a spectrum sweep across, brighter where denser. */
function nameArt(width: number): { src: string; height: number } {
  const dots = new Map<string, string[]>();
  const cw = width / nameMask.cols;
  const ch = cw * 2;
  nameMask.mask.forEach((row, y) => {
    [...row].forEach((d, x) => {
      const c = Number(d) / 9;
      if (c <= 0.1) return;
      const hue = Math.round((0.15 + (x / nameMask.cols) * 0.8) * 16) / 16;
      const level = Math.round((0.58 + c * 0.42) * 8) / 8;
      const s = 0.45 + c * 0.45;
      add(
        dots,
        spectrum(hue, level),
        x * cw + (cw * (1 - s)) / 2,
        y * ch + (ch * (1 - s)) / 2,
        +(cw * s).toFixed(2),
        +(ch * s).toFixed(2),
      );
    });
  });
  const height = Math.ceil(nameMask.rows * ch);
  return { src: svg(paths(dots), width, height), height };
}

export default async function OpengraphImage() {
  const [mono, pixel] = await Promise.all([
    readFile(join(process.cwd(), "assets/og/JetBrainsMono-Medium.ttf")),
    readFile(join(process.cwd(), "assets/og/PixelifySans.ttf")),
  ]);
  const name = nameArt(580);
  const portraitW = 500;
  const portraitH = Math.round(
    (portraitW * (portrait.rows * 4)) / (portrait.cols * 2),
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: BG,
        fontFamily: "JetBrains Mono",
        color: FG,
      }}
    >
      <img
        src={field()}
        width={W}
        height={H}
        alt=""
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <img
        src={portraitArt(portraitW, portraitH)}
        width={portraitW}
        height={portraitH}
        alt=""
        style={{ position: "absolute", left: 40, top: 30 }}
      />
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          top: 0,
          bottom: 0,
          right: 50,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Pixelify Sans",
            fontSize: 30,
            color: ACCENT,
          }}
        >
          ~/shreyit
        </div>
        <img
          src={name.src}
          width={580}
          height={name.height}
          alt=""
          style={{ marginTop: 22 }}
        />
        <div
          style={{ display: "flex", marginTop: 26, fontSize: 25, color: FG }}
        >
          analytics · ML · AI engineering
        </div>
        <div
          style={{ display: "flex", marginTop: 8, fontSize: 19, color: MUTED }}
        >
          BS Analytics &amp; Sustainability Studies · TISS Mumbai
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
          {["terminal", "sql playground", "ml lab", "fieldwork map"].map(
            (t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${spectrum(0.35, 0.7)}`,
                  background: "rgba(17,17,22,0.9)",
                  color: ACCENT,
                  fontSize: 17,
                }}
              >
                {t}
              </div>
            ),
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 50,
          bottom: 28,
          display: "flex",
          fontSize: 17,
          color: MUTED,
        }}
      >
        shreyit-portfolio.vercel.app ↗
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "JetBrains Mono", data: mono, style: "normal", weight: 500 },
        { name: "Pixelify Sans", data: pixel, style: "normal", weight: 500 },
      ],
    },
  );
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import portrait from "@/content/generated/og-portrait.json";
import nameMask from "@/content/generated/name-mask.json";

// The link preview (LinkedIn, Slack, X…): the hero as a still. The name in
// the same glyph mask as the site on the left, a dotted portrait on the
// right (cropped at the bottom and fading out), a spectrum field behind.
// Rendered once at build time.

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

// Text column on the left, portrait box on the right.
const TEXT_X = 64;
const PORTRAIT_W = 500;
const PORTRAIT_X = W - PORTRAIT_W - 6;

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
      const dx = (x - (TEXT_X + 290)) / 380;
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

/** One character per photo-palette index (scripts/build-og-portrait.mjs). */
const TINT_KEY =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

// 2×2 ordered-dither thresholds: each character cell becomes two stacked
// dots, roughly square at this size, so they stay crisp instead of smearing.
const DITHER = [
  [0.12, 0.62],
  [0.88, 0.38],
];

/**
 * The portrait as dots in the photo's own colours. Dot density follows
 * brightness (contrast-stretched, the white shirt held back so the face
 * leads); the figure fades out towards the bottom.
 */
function portraitArt(width: number): { src: string; height: number } {
  const dots = new Map<string, string[]>();
  // Half plain brightness, half histogram-equalised: stretches the narrow
  // band of skin tones so the glasses, beard and ear read.
  const counts = new Array<number>(10).fill(0);
  for (const line of portrait.lines)
    for (const d of line) if (d !== " ") counts[Number(d)]! += 1;
  const total = counts.reduce((a, b) => a + b, 0);
  let run = 0;
  const cdf = counts.map((c) => (run += c) / total);
  const tone = (d: number) => 0.5 * (d / 9) + 0.5 * cdf[d]!;
  const cw = width / portrait.cols;
  const ch = cw * 2;
  const py = ch / 2;
  const height = Math.min(H + 40, Math.ceil(portrait.rows * ch));
  // The photo's own colours.
  const photo = portrait.palette.map((h) => {
    const c = rgb(h);
    const l = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const sat = (Math.max(...c) - Math.min(...c)) / Math.max(Math.max(...c), 1);
    // Hair lifted to stay visible; the near-white shirt softened to grey.
    const k =
      l < 0.3 ? 0.3 / Math.max(l, 0.02) : l > 0.85 && sat < 0.12 ? 0.68 : 1;
    return c.map((v) => Math.min(255, v * k));
  });
  const natural = (tint: string, fade: number) => {
    const c = photo[TINT_KEY.indexOf(tint)]!;
    const f = Math.round(fade * 10) / 10;
    const m = c.map((v, k) => Math.round(BG_RGB[k]! + (v - BG_RGB[k]!) * f));
    return `rgb(${m[0]},${m[1]},${m[2]})`;
  };
  portrait.lines.forEach((line, y) => {
    const t = y / portrait.rows;
    // Full strength down to 55%, then a smooth fade to nothing.
    const fade = 1 - Math.min(1, Math.max(0, (t - 0.55) / 0.45)) ** 1.6;
    if (fade <= 0.02) return;
    [...line].forEach((d, x) => {
      if (d === " ") return;
      // Pure white (the shirt) held at a mid tone: the face stays brightest.
      const ink =
        d === "9" ? 0.42 : Math.max(0.18, Math.min(0.8, tone(Number(d))));
      const fill = natural(portrait.tints[y]![x]!, fade);
      for (let sy = 0; sy < 2; sy += 1) {
        if (ink <= DITHER[(y * 2 + sy) % 2]![x % 2]!) continue;
        add(
          dots,
          fill,
          x * cw + cw * 0.12,
          y * ch + sy * py + py * 0.12,
          +(cw * 0.76).toFixed(2),
          +(py * 0.76).toFixed(2),
        );
      }
    });
  });
  return { src: svg(paths(dots), width, height), height };
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
  const name = nameArt(560);
  const art = portraitArt(PORTRAIT_W);

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
        src={art.src}
        width={PORTRAIT_W}
        height={art.height}
        alt=""
        style={{ position: "absolute", left: PORTRAIT_X, top: 18 }}
      />
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          top: 0,
          bottom: 0,
          width: 600,
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
          width={560}
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
          left: TEXT_X,
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

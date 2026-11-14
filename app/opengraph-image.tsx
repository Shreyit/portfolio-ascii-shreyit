import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import nameMask from "@/content/generated/name-mask.json";

// The link preview (LinkedIn, Slack, X…): the hero as a still. The name in
// the same glyph mask as the site on the right; on the left the skills
// section's handheld, mid-boot like the site's loading screen; a spectrum
// field behind.
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

const svg = (body: string, w = W, h = H, rendering = "crispEdges") =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="${rendering}">${body}</svg>`,
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

// Console on the left, text column on the right.
const TEXT_X = 540;
const CONSOLE_X = 92;
const CONSOLE_W = 352;

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
      // Quiet behind the name, like the site.
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

// The boot log, as on the site's loading screen (components/boot).
const BOOT_LOG = [
  "mounting /dev/curiosity",
  "brewing chai",
  "surveying 116 households",
  "drawing a face in ascii",
  "teaching sqlite manners",
  "spinning up ec2 (imaginary)",
];

/** The "shreyit pocket" handheld (app/globals.css .console-*), mid-boot. */
function Handheld() {
  const ink = "#15111d";
  const round = {
    width: 42,
    height: 42,
    borderRadius: 999,
    background: `radial-gradient(circle at 35% 30%, #c9a6f2, ${STOPS[2]} 60%, #3a2a6e)`,
    boxShadow: "0 4px 0 rgba(0,0,0,0.55)",
  };
  const pill = (label: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        transform: "rotate(-22deg)",
        fontSize: 9,
        letterSpacing: 1.3,
        color: "rgba(237,237,237,0.55)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 10,
          borderRadius: 999,
          background: ink,
          boxShadow: "0 2px 0 rgba(0,0,0,0.55)",
        }}
      />
      {label}
    </div>
  );
  const dpad = {
    position: "absolute",
    width: 30,
    height: 30,
    background: ink,
  } as const;
  return (
    <div
      style={{
        position: "absolute",
        left: CONSOLE_X,
        top: 30,
        width: CONSOLE_W,
        display: "flex",
        flexDirection: "column",
        padding: "24px 24px 30px",
        borderRadius: "20px 20px 72px 20px",
        background: "linear-gradient(160deg, #3a3158, #2a2340 45%, #17121f)",
        boxShadow:
          "inset 0 2px 0 rgba(255,255,255,0.12), 0 30px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "12px 16px 16px",
          borderRadius: "10px 10px 32px 10px",
          background: "#0f0c16",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            fontSize: 10,
            letterSpacing: 1.4,
            color: "rgba(237,237,237,0.45)",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: STOPS[4],
              boxShadow: `0 0 8px ${STOPS[4]}`,
            }}
          />
          PX-7 · BOOTING
        </div>
        <div
          style={{
            height: 245,
            display: "flex",
            flexDirection: "column",
            padding: 14,
            borderRadius: 5,
            background: "radial-gradient(ellipse at 50% 40%, #241a45, #0a0710)",
            fontSize: 11,
            lineHeight: 1.6,
            color: "#e6e0f5",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Pixelify Sans",
                fontSize: 16,
                color: ACCENT,
              }}
            >
              shreyit-os
            </div>
            <div style={{ display: "flex", fontSize: 9, color: MUTED }}>
              v2026.11
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 6 }}
          >
            {BOOT_LOG.map((line) => (
              <div key={line} style={{ display: "flex", gap: 7 }}>
                <span style={{ color: STOPS[5] }}>[ok]</span>
                {line}
              </div>
            ))}
            <div style={{ display: "flex", gap: 7 }}>
              <span style={{ color: STOPS[3] }}>[..]</span>
              calibrating vibes
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              height: 9,
              border: `1px solid ${spectrum(0.4, 0.5)}`,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                width: "82%",
                background: `repeating-linear-gradient(90deg, ${ACCENT} 0 6px, transparent 6px 8px)`,
              }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 5,
          margin: "14px 0 18px 4px",
          fontFamily: "Pixelify Sans",
          fontSize: 19,
          color: "rgba(237,237,237,0.75)",
        }}
      >
        shreyit
        <span style={{ fontSize: 13, color: STOPS[4] }}>pocket</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 90,
            height: 90,
          }}
        >
          <div
            style={{ ...dpad, left: 30, top: 0, borderRadius: "5px 5px 0 0" }}
          />
          <div
            style={{ ...dpad, left: 0, top: 30, borderRadius: "5px 0 0 5px" }}
          />
          <div style={{ ...dpad, left: 30, top: 30 }} />
          <div
            style={{ ...dpad, left: 60, top: 30, borderRadius: "0 5px 5px 0" }}
          />
          <div
            style={{ ...dpad, left: 30, top: 60, borderRadius: "0 0 5px 5px" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginRight: 6,
            transform: "rotate(-22deg)",
          }}
        >
          <div style={{ ...round, marginTop: 24 }} />
          <div style={round} />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 22,
          paddingLeft: 32,
        }}
      >
        {pill("SELECT")}
        {pill("START")}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 34,
                borderRadius: 2,
                background: "rgba(0,0,0,0.5)",
                transform: "rotate(30deg)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
      <Handheld />
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

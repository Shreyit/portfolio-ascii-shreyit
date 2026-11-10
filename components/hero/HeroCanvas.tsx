"use client";

import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { HERO_COLS, HERO_ROWS, createTerrainScene } from "./terrain";
import { HERO_LABEL, HERO_MIN_FONT_PX } from "./constants";

export default function HeroCanvas() {
  return (
    <AsciiCanvas
      scene={createTerrainScene}
      cols={HERO_COLS}
      rows={HERO_ROWS}
      fps={30}
      minFontPx={HERO_MIN_FONT_PX}
      label={HERO_LABEL}
      className="hero-art"
    />
  );
}

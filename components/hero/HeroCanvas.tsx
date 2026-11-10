"use client";

import { useCallback, useRef } from "react";
import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { HERO_LABEL, HERO_MIN_FONT_PX } from "./constants";
import { NAME_COLS, NAME_ROWS, createNameScene } from "./name";

export default function HeroCanvas() {
  const scene = useRef<ReturnType<typeof createNameScene> | null>(null);
  const factory = useCallback(() => {
    scene.current = createNameScene();
    return scene.current;
  }, []);

  return (
    // A click anywhere on the art bursts the letters apart.
    <div className="hero-art-click" onClick={() => scene.current?.burst()}>
      <AsciiCanvas
        scene={factory}
        cols={NAME_COLS}
        rows={NAME_ROWS}
        fps={45}
        minFontPx={HERO_MIN_FONT_PX}
        label={HERO_LABEL}
        className="hero-art"
        transparent
      />
    </div>
  );
}

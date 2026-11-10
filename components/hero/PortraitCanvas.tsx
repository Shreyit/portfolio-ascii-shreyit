"use client";

import { useCallback, useRef } from "react";
import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { PORTRAIT_LABEL, PORTRAIT_MIN_FONT_PX } from "./constants";
import { PORTRAIT_COLS, PORTRAIT_ROWS, createPortraitScene } from "./portrait";

export default function PortraitCanvas() {
  const scene = useRef<ReturnType<typeof createPortraitScene> | null>(null);
  const factory = useCallback(() => {
    scene.current = createPortraitScene({ intro: true });
    return scene.current;
  }, []);

  return (
    // A click anywhere on the portrait bursts the dots apart.
    <div className="hero-art-click" onClick={() => scene.current?.burst()}>
      <AsciiCanvas
        scene={factory}
        cols={PORTRAIT_COLS}
        rows={PORTRAIT_ROWS}
        fps={30}
        minFontPx={PORTRAIT_MIN_FONT_PX}
        label={PORTRAIT_LABEL}
        className="portrait-art"
        transparent
      />
    </div>
  );
}

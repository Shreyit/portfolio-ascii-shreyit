"use client";

import { useCallback } from "react";
import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { PORTRAIT_LABEL, PORTRAIT_MIN_FONT_PX } from "./constants";
import tints from "@/content/generated/portrait-tints.json";
import { PORTRAIT_COLS, PORTRAIT_ROWS, createPortraitScene } from "./portrait";

// The photo's own colours, drawn by the interactive canvas only (the static
// fallback keeps a single tint).
const PHOTO_COLOURS: readonly string[] = tints.palette;

export default function PortraitCanvas() {
  const factory = useCallback(
    () => createPortraitScene({ intro: true, tints: tints.tints }),
    [],
  );

  return (
    <AsciiCanvas
      scene={factory}
      cols={PORTRAIT_COLS}
      rows={PORTRAIT_ROWS}
      fps={30}
      minFontPx={PORTRAIT_MIN_FONT_PX}
      label={PORTRAIT_LABEL}
      className="portrait-art"
      transparent
      extraColors={PHOTO_COLOURS}
    />
  );
}

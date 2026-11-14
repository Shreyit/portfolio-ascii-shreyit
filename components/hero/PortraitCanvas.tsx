"use client";

import { useCallback } from "react";
import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { PORTRAIT_LABEL, PORTRAIT_MIN_FONT_PX } from "./constants";
import {
  PORTRAIT_COLOURS,
  PORTRAIT_COLS,
  PORTRAIT_ROWS,
  createPortraitScene,
} from "./portrait";

export default function PortraitCanvas() {
  const factory = useCallback(() => createPortraitScene({ intro: true }), []);

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
      extraColors={PORTRAIT_COLOURS}
    />
  );
}

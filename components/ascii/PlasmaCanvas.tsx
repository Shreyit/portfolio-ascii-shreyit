"use client";

import { AsciiCanvas } from "./AsciiCanvas";
import { createPlasmaScene } from "./engine/scenes/plasma";

interface PlasmaCanvasProps {
  cols: number;
  rows: number;
  label: string;
  fps?: number;
}

export function PlasmaCanvas({ cols, rows, label, fps }: PlasmaCanvasProps) {
  return (
    <AsciiCanvas
      scene={createPlasmaScene}
      cols={cols}
      rows={rows}
      label={label}
      fps={fps}
    />
  );
}

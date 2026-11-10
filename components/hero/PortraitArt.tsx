import type { CSSProperties } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { PORTRAIT_LABEL, PORTRAIT_MIN_FONT_PX } from "./constants";
import { PortraitIsland } from "./PortraitIsland";
import { PORTRAIT_COLS, PORTRAIT_ROWS, createPortraitScene } from "./portrait";

/**
 * Server-rendered static portrait (readable without scripts), upgraded to
 * the interactive canvas by PortraitIsland. Same figure markup and sizing as
 * AsciiCanvas, so the swap causes no layout shift.
 */
export function PortraitArt() {
  const grid = new AsciiGrid(PORTRAIT_COLS, PORTRAIT_ROWS);
  createPortraitScene().staticFrame(grid);
  const style = {
    "--ascii-cols": PORTRAIT_COLS,
    "--ascii-rows": PORTRAIT_ROWS,
    "--ascii-min-font": `${PORTRAIT_MIN_FONT_PX}px`,
    aspectRatio: `${PORTRAIT_COLS * 0.6} / ${PORTRAIT_ROWS * 1.2}`,
  } as CSSProperties;
  return (
    <PortraitIsland>
      <figure
        className="ascii-figure portrait-art"
        style={style}
        role="img"
        aria-label={PORTRAIT_LABEL}
      >
        <pre aria-hidden="true" className="ascii-pre">
          {grid.toPlainText()}
        </pre>
      </figure>
    </PortraitIsland>
  );
}

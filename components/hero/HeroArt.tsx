import type { CSSProperties } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { HERO_LABEL, HERO_MIN_FONT_PX } from "./constants";
import { HeroIsland } from "./HeroIsland";
import { HERO_COLS, HERO_ROWS, createTerrainScene } from "./terrain";

/**
 * Server-rendered static contour map (zero JS, readable without scripts),
 * upgraded to the animated canvas by HeroIsland. Uses the same figure
 * markup and sizing as AsciiCanvas so the swap causes no layout shift.
 */
export function HeroArt() {
  const grid = new AsciiGrid(HERO_COLS, HERO_ROWS);
  createTerrainScene().staticFrame(grid);
  const style = {
    "--ascii-cols": HERO_COLS,
    "--ascii-rows": HERO_ROWS,
    "--ascii-min-font": `${HERO_MIN_FONT_PX}px`,
    aspectRatio: `${HERO_COLS * 0.6} / ${HERO_ROWS * 1.2}`,
  } as CSSProperties;
  return (
    <HeroIsland>
      <figure
        className="ascii-figure hero-art"
        style={style}
        role="img"
        aria-label={HERO_LABEL}
      >
        <pre aria-hidden="true" className="ascii-pre">
          {grid.toPlainText()}
        </pre>
      </figure>
    </HeroIsland>
  );
}

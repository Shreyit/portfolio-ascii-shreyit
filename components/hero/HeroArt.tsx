import type { CSSProperties } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { HERO_LABEL, HERO_MIN_FONT_PX } from "./constants";
import { HeroIsland } from "./HeroIsland";
import { NAME_COLS, NAME_ROWS, createNameScene } from "./name";

/**
 * Server-rendered static name art (zero JS, readable without scripts),
 * upgraded to the animated canvas by HeroIsland. Uses the same figure
 * markup and sizing as AsciiCanvas so the swap causes no layout shift.
 */
export function HeroArt() {
  const grid = new AsciiGrid(NAME_COLS, NAME_ROWS);
  createNameScene().staticFrame(grid);
  const style = {
    "--ascii-cols": NAME_COLS,
    "--ascii-rows": NAME_ROWS,
    "--ascii-min-font": `${HERO_MIN_FONT_PX}px`,
    aspectRatio: `${NAME_COLS * 0.6} / ${NAME_ROWS * 1.2}`,
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

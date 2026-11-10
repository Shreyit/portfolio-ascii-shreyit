"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AsciiGrid } from "./engine/grid";
import { CanvasRenderer } from "./engine/renderer";
import { scheduler, type SchedulerHandle } from "./engine/scheduler";
import type { AsciiScene, PointerInput } from "./engine/scene";

export interface AsciiStatsEntry {
  frames: number;
  cellsDrawn: number;
  lastFrameMs: number;
}

declare global {
  interface Window {
    __asciiStats?: AsciiStatsEntry[];
  }
}

interface AsciiCanvasProps {
  scene: () => AsciiScene;
  cols: number;
  rows: number;
  /** Accessible description of the scene — required. */
  label: string;
  fps?: number;
  /** Smallest font size (CSS px) before the figure stops shrinking. */
  minFontPx?: number;
  className?: string;
}

const CELL_ASPECT = 0.6; // JetBrains Mono advance = 600/1000 em
const LINE_HEIGHT = 1.2;
const DEFAULT_MIN_FONT_PX = 6;

export function AsciiCanvas({
  scene,
  cols,
  rows,
  label,
  fps,
  minFontPx = DEFAULT_MIN_FONT_PX,
  className,
}: AsciiCanvasProps) {
  // Static frame is computed with a plain grid — runs on the server and
  // works with no JS at all.
  const staticText = useMemo(() => {
    const grid = new AsciiGrid(cols, rows);
    scene().staticFrame(grid);
    return grid.toPlainText();
  }, [scene, cols, rows]);

  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const figure = figureRef.current;
    const canvas = canvasRef.current;
    if (!figure || !canvas) {
      return;
    }

    const exposeStats =
      process.env.NODE_ENV !== "production" ||
      window.location.search.includes("asciiStats");

    const grid = new AsciiGrid(cols, rows);
    const sceneInstance = scene();
    const statsEntry: AsciiStatsEntry = {
      frames: 0,
      cellsDrawn: 0,
      lastFrameMs: 0,
    };

    let disposed = false;
    let renderer: CanvasRenderer | null = null;
    let handle: SchedulerHandle | null = null;
    let intersection: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame = 0;
    let swapped = false;

    // Pointer position in grid cells, shared with the scene each frame.
    const pointer: PointerInput = { x: 0, y: 0, active: false };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * cols;
      pointer.y = ((event.clientY - rect.top) / rect.height) * rows;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    figure.addEventListener("pointermove", onPointerMove);
    figure.addEventListener("pointerleave", onPointerLeave);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const trackStats = () => {
      if (!exposeStats) {
        return;
      }
      window.__asciiStats = window.__asciiStats ?? [];
      if (!window.__asciiStats.includes(statsEntry)) {
        window.__asciiStats.push(statsEntry);
      }
    };

    const untrackStats = () => {
      if (!exposeStats || !window.__asciiStats) {
        return;
      }
      window.__asciiStats = window.__asciiStats.filter(
        (entry) => entry !== statsEntry,
      );
    };

    const start = () => {
      if (disposed || renderer) {
        return;
      }
      const fontFamily = getComputedStyle(figure).fontFamily;
      renderer = new CanvasRenderer(canvas, grid, { fontFamily, maxDpr: 2 });
      void renderer
        .init(canvas.clientWidth, canvas.clientHeight)
        .then(() => {
          if (disposed || !renderer) {
            renderer?.destroy();
            return;
          }
          sceneInstance.init(grid);
          trackStats();

          handle = scheduler.register({
            fps,
            update: (timeMs, dtMs) => {
              sceneInstance.update(grid, timeMs, dtMs, pointer);
              renderer?.render();
              if (renderer) {
                statsEntry.frames = renderer.stats.frames;
                statsEntry.cellsDrawn = renderer.stats.cellsDrawn;
                statsEntry.lastFrameMs = renderer.stats.lastFrameMs;
              }
              if (!swapped) {
                swapped = true;
                if (!disposed) {
                  setCanvasReady(true);
                }
              }
            },
          });

          intersection = new IntersectionObserver(
            (entries) => {
              const nextVisible = entries[0]?.isIntersecting ?? true;
              if (nextVisible) {
                handle?.resume();
              } else {
                handle?.pause();
              }
            },
            { rootMargin: "100px" },
          );
          intersection.observe(figure);

          // Keep the canvas backing store matched to its CSS box. Coalesced
          // to one relayout per frame; draws immediately so a paused
          // (off-screen) instance is still correct when it scrolls back.
          resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
              if (!renderer) {
                return;
              }
              renderer.resize(canvas.clientWidth, canvas.clientHeight);
              renderer.render();
            });
          });
          resizeObserver.observe(canvas);
        })
        .catch((error: unknown) => {
          // Renderer failed (e.g. no 2d context) — the <pre> fallback stays.
          console.error("AsciiCanvas init failed", error);
        });
    };

    const stop = () => {
      cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      resizeObserver = null;
      intersection?.disconnect();
      intersection = null;
      handle?.dispose();
      handle = null;
      renderer?.destroy();
      renderer = null;
      untrackStats();
      swapped = false;
      if (!disposed) {
        setCanvasReady(false);
      }
    };

    const onMediaChange = () => {
      if (media.matches) {
        stop();
      } else {
        start();
      }
    };

    if (!media.matches) {
      start();
    }
    media.addEventListener("change", onMediaChange);

    return () => {
      disposed = true;
      media.removeEventListener("change", onMediaChange);
      figure.removeEventListener("pointermove", onPointerMove);
      figure.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      resizeObserver = null;
      intersection?.disconnect();
      intersection = null;
      handle?.dispose();
      handle = null;
      renderer?.destroy();
      renderer = null;
      untrackStats();
    };
  }, [scene, cols, rows, fps]);

  const style = {
    "--ascii-cols": cols,
    "--ascii-rows": rows,
    "--ascii-min-font": `${minFontPx}px`,
    aspectRatio: `${cols * CELL_ASPECT} / ${rows * LINE_HEIGHT}`,
  } as CSSProperties;

  return (
    <figure
      ref={figureRef}
      className={["ascii-figure", className].filter(Boolean).join(" ")}
      style={style}
      role="img"
      aria-label={label}
    >
      <pre aria-hidden="true" className="ascii-pre" data-hidden={canvasReady}>
        {staticText}
      </pre>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="ascii-canvas"
        data-ready={canvasReady}
      />
    </figure>
  );
}

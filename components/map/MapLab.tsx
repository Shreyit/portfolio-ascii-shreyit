"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { MAP_COLS, MAP_ROWS } from "./geo";
import { MAP_LABEL, MAP_MIN_FONT_PX } from "./constants";
import { MapView, type JourneyStop } from "./MapView";
import { createMapScene, type MapScene } from "./scene";

const PLAY_STEP_MS = 2600;

export default function MapLab({ stops }: { stops: JourneyStop[] }) {
  const scene = useRef<MapScene | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const factory = useCallback(() => {
    scene.current = createMapScene(stops, setHovered);
    return scene.current;
  }, [stops]);

  const shown = hovered ?? preview ?? active;
  useEffect(() => {
    scene.current?.setActive(shown);
  }, [shown]);

  // Play: step through the journey in order, then stop on the last stop.
  useEffect(() => {
    if (!playing) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      if (i >= stops.length) {
        setPlaying(false);
        return;
      }
      setActive(stops[i]!.slug);
    }, PLAY_STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, stops]);

  const select = (slug: string | null) => {
    setPlaying(false);
    setActive(slug);
  };

  return (
    <MapView
      stops={stops}
      active={active}
      shown={shown}
      playing={playing}
      onSelect={select}
      onPreview={setPreview}
      onTogglePlay={() => {
        if (!playing) setActive(stops[0]?.slug ?? null);
        setPlaying(!playing);
      }}
      figure={
        // Clicking a marker pins it.
        <div
          className="map-canvas"
          onClick={() => {
            const slug = scene.current?.hovered;
            if (slug) select(slug);
          }}
        >
          <AsciiCanvas
            scene={factory}
            cols={MAP_COLS}
            rows={MAP_ROWS}
            fps={24}
            minFontPx={MAP_MIN_FONT_PX}
            label={MAP_LABEL}
            className="map-art"
          />
        </div>
      }
    />
  );
}

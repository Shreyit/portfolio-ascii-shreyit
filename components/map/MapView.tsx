// Presentational only (no hooks, no "use client"): rendered by the server as
// the static fallback, and by the lazily loaded MapLab with handlers.
import type { ReactNode } from "react";
import type { MapPlace, PlaceKind } from "./scene";

export interface JourneyStop extends MapPlace {
  title: string;
  detail: string;
  period: string | null;
}

export const KIND_LABEL: Record<PlaceKind, string> = {
  home: "home",
  study: "study",
  fieldwork: "fieldwork",
  work: "work",
};

export interface MapViewProps {
  stops: readonly JourneyStop[];
  /** The figure: a static <pre> on the server, the canvas on the client. */
  figure: ReactNode;
  /** The pinned place (click or play). */
  active?: string | null;
  /** What the card shows: a previewed (hovered) place, else the pinned one. */
  shown?: string | null;
  playing?: boolean;
  onSelect?: (slug: string | null) => void;
  onPreview?: (slug: string | null) => void;
  onTogglePlay?: () => void;
}

export function MapView(props: MapViewProps) {
  const interactive = Boolean(props.onSelect);
  const on = <T,>(handler: T): T | undefined =>
    interactive ? handler : undefined;
  const current =
    props.stops.find((s) => s.slug === (props.shown ?? props.active)) ?? null;

  return (
    <div className="map">
      <div className="map-figure">{props.figure}</div>
      <div className="map-side">
        <div className="map-side-head">
          <p className="sql-label">journey · {props.stops.length} places</p>
          <button
            type="button"
            className="map-play"
            disabled={!interactive}
            aria-pressed={props.playing ?? false}
            onClick={props.onTogglePlay}
          >
            {props.playing ? "pause journey" : "play journey"}
          </button>
        </div>
        <ol className="map-stops">
          {props.stops.map((stop, i) => (
            <li key={stop.slug}>
              <button
                type="button"
                className="map-stop"
                data-kind={stop.kind}
                disabled={!interactive}
                aria-pressed={props.active === stop.slug}
                onClick={on(() =>
                  props.onSelect?.(
                    props.active === stop.slug ? null : stop.slug,
                  ),
                )}
                onMouseEnter={on(() => props.onPreview?.(stop.slug))}
                onMouseLeave={on(() => props.onPreview?.(null))}
                onFocus={on(() => props.onPreview?.(stop.slug))}
                onBlur={on(() => props.onPreview?.(null))}
              >
                <span className="map-stop-index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="map-stop-name">
                  {stop.name}
                  <span className="map-stop-state">, {stop.state}</span>
                </span>
                <span className="map-stop-kind">{KIND_LABEL[stop.kind]}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="map-card" aria-live="polite">
          {current ? (
            <>
              <p className="map-card-coords" aria-hidden="true">
                {current.lat.toFixed(2)}°N · {current.lon.toFixed(2)}°E ·{" "}
                {current.name.toLowerCase()}
              </p>
              <p className="map-card-title">{current.title}</p>
              <p className="map-card-detail">{current.detail}</p>
              {current.period ? (
                <p className="map-card-period">{current.period}</p>
              ) : null}
            </>
          ) : (
            <p className="map-card-detail">
              From home in Patna to Mumbai for my degree, then out to the field
              and to work. Hover a place, on the map or in the list.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

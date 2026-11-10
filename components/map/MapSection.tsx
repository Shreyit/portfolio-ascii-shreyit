import type { CSSProperties } from "react";
import { AsciiGrid } from "@/components/ascii/engine/grid";
import { formatPeriod } from "@/components/ActivityList";
import { LabPanel } from "@/components/LabPanel";
import { education, experience, profile, research } from "@/content";
import { MAP_LABEL, MAP_MIN_FONT_PX } from "./constants";
import { MAP_COLS, MAP_ROWS } from "./geo";
import { MapIsland } from "./MapIsland";
import { MapView, type JourneyStop } from "./MapView";
import { createMapScene } from "./scene";

const ID = "map";

function fieldwork(slug: string) {
  const entry = research.find((r) => r.slug === slug);
  if (!entry) return null;
  const sample = entry.sample.map((s) => `${s.n} ${s.label}`).join(", ");
  return {
    title: entry.title,
    detail: `${entry.partner}. ${sample}.`,
    period: formatPeriod(entry.period),
  };
}

/** Journey stops, in order. Coordinates are city centres. */
function buildStops(): JourneyStop[] {
  const stops: (JourneyStop | null)[] = [
    {
      slug: "patna",
      name: "Patna",
      state: "Bihar",
      lon: 85.14,
      lat: 25.59,
      kind: "home",
      from: null,
      label: "right",
      title: "Home",
      detail: "Where I'm from.",
      period: null,
    },
    {
      slug: "mumbai",
      name: "Mumbai",
      state: "Maharashtra",
      lon: 72.88,
      lat: 19.08,
      kind: "study",
      from: "patna",
      label: "left",
      title: profile.institution,
      detail: `${profile.degree}.`,
      period: education[0] ? formatPeriod(education[0].period) : null,
    },
    ...[
      {
        slug: "nainital",
        research: "nainital-urban-fieldwork",
        name: "Nainital",
        state: "Uttarakhand",
        lon: 79.46,
        lat: 29.38,
        label: "right" as const,
      },
      {
        slug: "sangamner",
        research: "sangamner-rural-fieldwork",
        name: "Sangamner",
        state: "Maharashtra",
        lon: 74.21,
        lat: 19.57,
        label: "right" as const,
      },
    ].map(({ research: slug, ...place }) => {
      const info = fieldwork(slug);
      return info
        ? { ...place, ...info, kind: "fieldwork" as const, from: "mumbai" }
        : null;
    }),
    ...experience
      .filter((e) => e.location?.startsWith("Gurugram"))
      .map((e) => ({
        slug: "gurugram",
        name: "Gurugram",
        state: "Haryana",
        lon: 77.03,
        lat: 28.46,
        kind: "work" as const,
        from: "mumbai",
        label: "left" as const,
        title: `${e.role}, ${e.organisation}`,
        detail: e.highlights[0] ?? "",
        period: formatPeriod(e.period),
      })),
  ];
  return stops.filter((s): s is JourneyStop => s !== null);
}

export function MapSection() {
  const stops = buildStops();
  const grid = new AsciiGrid(MAP_COLS, MAP_ROWS);
  createMapScene(stops).staticFrame(grid);
  const style = {
    "--ascii-cols": MAP_COLS,
    "--ascii-rows": MAP_ROWS,
    "--ascii-min-font": `${MAP_MIN_FONT_PX}px`,
    aspectRatio: `${MAP_COLS * 0.6} / ${MAP_ROWS * 1.2}`,
  } as CSSProperties;

  return (
    <LabPanel
      id={`${ID}-heading`}
      title="Where I've lived & worked"
      command="~/maps/journey.shp"
      intro={
        <p className="lab-intro">
          A flow map drawn from state boundary shapefiles: home, study,
          fieldwork and work, with each journey travelling out from Mumbai.
        </p>
      }
    >
      <MapIsland stops={stops}>
        <MapView
          stops={stops}
          figure={
            <figure
              className="ascii-figure map-art"
              style={style}
              role="img"
              aria-label={MAP_LABEL}
            >
              <pre aria-hidden="true" className="ascii-pre">
                {grid.toPlainText()}
              </pre>
            </figure>
          }
        />
      </MapIsland>
      <p className="map-source">
        Boundaries:{" "}
        <a href="https://github.com/datameet/maps">DataMeet India</a> (CC BY
        4.0), simplified.
      </p>
    </LabPanel>
  );
}

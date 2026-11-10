// Presentational only (no hooks, no "use client"): the server renders it as
// the static fallback; the lazily loaded ResearchLab renders it with handlers.
import type React from "react";
import type { Project, ResearchEntry } from "@/content/schema";
import {
  IRRIDEX,
  NAINITAL_DASHBOARD,
  NAINITAL_FIELDWORK,
  SANGAMNER,
} from "@/content/research-lab";

export type StudyKey = "nainital-fieldwork" | "sangamner" | "dashboard";

export interface ResearchState {
  study: StudyKey;
  stage: string | null;
  cell: string | null; // "Group|Pillar"
  measure: "aware" | "used";
}

export const INITIAL_RESEARCH_STATE: ResearchState = {
  study: "nainital-fieldwork",
  stage: null,
  cell: null,
  measure: "aware",
};

export interface ResearchData {
  nainital?: ResearchEntry;
  sangamner?: ResearchEntry;
  dashboard?: Project;
}

export interface ResearchViewProps extends ResearchState {
  idBase: string;
  data: ResearchData;
  onChange?: (patch: Partial<ResearchState>) => void;
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
function period(p: { start: string | null; end: string | null }): string {
  const f = (v: string) => {
    const [y, m] = v.split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  };
  if (p.start && p.end && p.start !== p.end)
    return `${f(p.start)} – ${f(p.end)}`;
  return p.start ? f(p.start) : p.end ? f(p.end) : "";
}

/** A 10x10 grid with `pct` cells filled ("#"), a partial cell as "+". */
export function waffle(pct: number): string[] {
  const full = Math.floor(pct);
  const partial = pct - full > 0;
  const rows: string[] = [];
  for (let r = 0; r < 10; r += 1) {
    let row = "";
    for (let c = 0; c < 10; c += 1) {
      const i = r * 10 + c;
      row += (i < full ? "#" : i === full && partial ? "+" : ".") + " ";
    }
    rows.push(row.trimEnd());
  }
  return rows;
}

export function ResearchView(props: ResearchViewProps) {
  const interactive = Boolean(props.onChange);
  const on = <T,>(handler: T): T | undefined =>
    interactive ? handler : undefined;
  const set = (patch: Partial<ResearchState>) => props.onChange?.(patch);

  const tabs: { key: StudyKey; label: string; present: boolean }[] = [
    {
      key: "nainital-fieldwork",
      label: "Nainital · urban fieldwork",
      present: Boolean(props.data.nainital),
    },
    {
      key: "sangamner",
      label: "Sangamner · rural fieldwork",
      present: Boolean(props.data.sangamner),
    },
    {
      key: "dashboard",
      label: "Nainital · vulnerability index",
      present: Boolean(props.data.dashboard),
    },
  ];

  return (
    <div className="research">
      <div className="ml-tabs" role="tablist" aria-label="Studies">
        {tabs
          .filter((t) => t.present)
          .map((tab) => (
            <button
              key={tab.key}
              id={`${props.idBase}-tab-${tab.key}`}
              type="button"
              role="tab"
              className="sql-chip"
              aria-selected={props.study === tab.key}
              aria-controls={`${props.idBase}-panel`}
              disabled={!interactive}
              onClick={on(() =>
                set({ study: tab.key, stage: null, cell: null }),
              )}
            >
              {tab.label}
            </button>
          ))}
      </div>
      <div
        id={`${props.idBase}-panel`}
        role="tabpanel"
        aria-labelledby={`${props.idBase}-tab-${props.study}`}
        className="research-panel"
      >
        {props.study === "nainital-fieldwork" && props.data.nainital && (
          <NainitalFieldwork
            entry={props.data.nainital}
            {...props}
            on={on}
            set={set}
          />
        )}
        {props.study === "sangamner" && props.data.sangamner && (
          <Sangamner
            entry={props.data.sangamner}
            {...props}
            on={on}
            set={set}
          />
        )}
        {props.study === "dashboard" && props.data.dashboard && (
          <Dashboard
            project={props.data.dashboard}
            {...props}
            on={on}
            set={set}
          />
        )}
      </div>
    </div>
  );
}

interface PanelProps extends ResearchViewProps {
  on: <T>(handler: T) => T | undefined;
  set: (patch: Partial<ResearchState>) => void;
}

function StudyHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <header className="research-header">
      <h3>{title}</h3>
      <p className="t-muted">{meta}</p>
    </header>
  );
}

function Pipeline({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="research-pipeline" aria-label="Method">
      {steps.map((step, i) => (
        <li key={step}>
          <span className="t-muted">{String(i + 1).padStart(2, "0")}</span>{" "}
          {step}
        </li>
      ))}
    </ol>
  );
}

/** Plain counts: samples are in different units (people, households,
 * villages), so they are listed rather than drawn on one shared scale. */
function Samples({ items }: { items: { label: string; n: number }[] }) {
  return (
    <ul className="research-samples" aria-label="Samples">
      {items.map((item) => (
        <li key={item.label}>
          <strong>{item.n.toLocaleString("en-IN")}</strong>{" "}
          <span className="t-muted">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Findings({ items }: { items: readonly string[] }) {
  return (
    <ul className="research-findings">
      {items.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

function NainitalFieldwork({
  entry,
  stage,
  on,
  set,
  onChange,
}: PanelProps & { entry: ResearchEntry }) {
  const interactive = Boolean(onChange);
  const focus = IRRIDEX.find(
    (s) => s.stage === (stage ?? NAINITAL_FIELDWORK.stage),
  )!;
  return (
    <>
      <StudyHeader
        title={entry.title}
        meta={[entry.partner, period(entry.period)].join("  |  ")}
      />
      <div className="ml-columns">
        <div className="research-block">
          <h4>Doxey&apos;s Irridex</h4>
          <ol className="irridex" aria-label="Irridex stages">
            {IRRIDEX.map((s, i) => {
              const here = s.stage === NAINITAL_FIELDWORK.stage;
              return (
                <li key={s.stage}>
                  <button
                    type="button"
                    className="irridex-stage"
                    data-here={here}
                    data-active={focus.stage === s.stage}
                    disabled={!interactive}
                    style={{ "--step": i } as React.CSSProperties}
                    onMouseEnter={on(() => set({ stage: s.stage }))}
                    onFocus={on(() => set({ stage: s.stage }))}
                    onMouseLeave={on(() => set({ stage: null }))}
                    onBlur={on(() => set({ stage: null }))}
                  >
                    <span>{s.stage}</span>
                    {here && (
                      <span className="irridex-pin">
                        ◀ Nainital · RII {NAINITAL_FIELDWORK.rii}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="ml-note" aria-live="polite">
            {focus.stage}: {focus.gist}.
          </p>
        </div>
        <div className="research-block">
          <h4>Method</h4>
          <Pipeline steps={entry.methods} />
          <h4>Samples</h4>
          <Samples items={entry.sample} />
        </div>
      </div>
      <h4>Findings</h4>
      <Findings items={entry.findings} />
    </>
  );
}

function Sangamner({
  entry,
  measure,
  on,
  set,
  onChange,
}: PanelProps & { entry: ResearchEntry }) {
  const interactive = Boolean(onChange);
  const pct = measure === "aware" ? SANGAMNER.awarePct : SANGAMNER.usedPct;
  const label =
    measure === "aware"
      ? "aware of Ayushman Bharat scheme benefits"
      : "had used PM-JAY benefits at a hospital";
  return (
    <>
      <StudyHeader
        title={entry.title}
        meta={[entry.partner, period(entry.period)].join("  |  ")}
      />
      <div className="ml-columns">
        <div className="research-block">
          <h4>Per 100 Ayushman Bharat cardholders</h4>
          <div className="ml-chips" role="radiogroup" aria-label="Measure">
            {(["aware", "used"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                className="sql-chip"
                aria-checked={measure === m}
                disabled={!interactive}
                onClick={on(() => set({ measure: m }))}
              >
                {m === "aware" ? "aware of benefits" : "used at a hospital"}
              </button>
            ))}
          </div>
          <pre className="research-waffle" aria-hidden="true">
            {waffle(pct).join("\n")}
          </pre>
          <p className="ml-note" aria-live="polite">
            {pct}% of cardholders {label}.
          </p>
        </div>
        <div className="research-block">
          <h4>Method</h4>
          <Pipeline steps={entry.methods} />
          <h4>Samples</h4>
          <Samples items={entry.sample} />
        </div>
      </div>
      <h4>Findings</h4>
      <Findings items={entry.findings} />
    </>
  );
}

function Dashboard({
  project,
  cell,
  on,
  set,
  onChange,
}: PanelProps & { project: Project }) {
  const interactive = Boolean(onChange);
  const tbl = NAINITAL_DASHBOARD.tripleBottomLine;
  const active = tbl.cells.find((c) => `${c.group}|${c.pillar}` === cell);
  return (
    <>
      <StudyHeader
        title={project.title}
        meta={`team of ${NAINITAL_DASHBOARD.team} · my part: ${NAINITAL_DASHBOARD.role}`}
      />
      <div className="ml-columns">
        <div className="research-block">
          <h4>Who feels which pressure</h4>
          <p className="ml-note">
            Mean indicator score (0–1) per stakeholder group and Triple Bottom
            Line pillar, as reported by the study.
          </p>
          <div
            className="tbl"
            role="table"
            aria-label="Stakeholder by pillar scores"
          >
            <div role="row" className="tbl-row">
              <span role="columnheader" />
              {tbl.pillars.map((p) => (
                <span key={p} role="columnheader" className="t-muted">
                  {p}
                </span>
              ))}
            </div>
            {tbl.groups.map((g) => (
              <div key={g} role="row" className="tbl-row">
                <span role="rowheader" className="t-muted">
                  {g}
                </span>
                {tbl.pillars.map((p) => {
                  const c = tbl.cells.find(
                    (x) => x.group === g && x.pillar === p,
                  )!;
                  const key = `${g}|${p}`;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="cell"
                      className="tbl-cell"
                      data-active={cell === key}
                      data-missing={c.mean === null}
                      disabled={!interactive}
                      aria-label={
                        c.mean === null
                          ? `n/a: ${g}, ${p}, not measured`
                          : `${c.mean.toFixed(2)}: ${g}, ${p}, from ${c.n} respondents`
                      }
                      style={{ "--v": c.mean ?? 0 } as React.CSSProperties}
                      onMouseEnter={on(() => set({ cell: key }))}
                      onFocus={on(() => set({ cell: key }))}
                      onMouseLeave={on(() => set({ cell: null }))}
                      onBlur={on(() => set({ cell: null }))}
                    >
                      {c.mean === null ? "n/a" : c.mean.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="ml-note" aria-live="polite">
            {active
              ? active.mean === null
                ? `${active.group} · ${active.pillar}: not measured. No survey question asked workers about environmental conditions, so it is left blank rather than filled with a guess.`
                : `${active.group} · ${active.pillar}: ${active.mean.toFixed(3)}, from ${active.n} respondents.`
              : "hover a cell for its sample size."}
          </p>
        </div>
        <div className="research-block">
          <h4>Six pillars of the index</h4>
          <Pipeline steps={NAINITAL_DASHBOARD.pillars} />
          <p className="ml-note">
            {NAINITAL_DASHBOARD.responses.toLocaleString("en-IN")} survey
            responses across {NAINITAL_DASHBOARD.zones} zones.
          </p>
          {(project.links.live || project.links.repo) && (
            <p className="ml-note">
              {project.links.live && (
                <a
                  href={project.links.live}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  live dashboard
                </a>
              )}
              {project.links.live && project.links.repo && " · "}
              {project.links.repo && (
                <a
                  href={project.links.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  source
                </a>
              )}
            </p>
          )}
        </div>
      </div>
      <h4>Findings</h4>
      <Findings items={project.highlights} />
    </>
  );
}

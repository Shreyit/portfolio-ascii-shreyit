// Presentational only (no hooks, no "use client"): the server renders it as
// the static fallback; the lazily loaded MlLab renders it with handlers.
import type React from "react";
import { RINN, type Confusion } from "@/content/rinn-lab";
import { sweepChart } from "./render";

export type MlTab = "arena" | "threshold" | "fit";
export type CellKey = keyof Confusion;
export type RankBy = "accuracy" | "recall" | "f1" | "rocAuc";
export type SweepKey = "knn" | "depth";

export interface MlViewState {
  tab: MlTab;
  model: string;
  rankBy: RankBy;
  threshold: 0.5 | 0.3;
  sweep: SweepKey;
  sweepIndex: number;
  cell: CellKey | null;
}

export interface MlViewProps extends MlViewState {
  idBase: string;
  onChange?: (patch: Partial<MlViewState>) => void;
}

export const INITIAL_ML_STATE: MlViewState = {
  tab: "arena",
  model: "logistic",
  rankBy: "accuracy",
  threshold: 0.5,
  sweep: "depth",
  sweepIndex: 5,
  cell: null,
};

const CELLS: { key: CellKey; label: string; meaning: string }[] = [
  { key: "tn", label: "TN", meaning: "repaid, and the model approved them" },
  {
    key: "fp",
    label: "FP",
    meaning: "would have repaid, but were flagged as risky: a lost customer",
  },
  {
    key: "fn",
    label: "FN",
    meaning: "defaulted, but the model approved them: the costly miss",
  },
  { key: "tp", label: "TP", meaning: "defaulted, and the model flagged them" },
];

const RANK_LABELS: Record<RankBy, string> = {
  accuracy: "accuracy",
  recall: "recall",
  f1: "F1",
  rocAuc: "ROC-AUC",
};

const SWEEPS: Record<SweepKey, { label: string; param: string }> = {
  knn: { label: "k-nearest neighbours", param: "k" },
  depth: { label: "decision tree", param: "depth" },
};

const fmt = (v: number) => v.toFixed(3);
const total = RINN.dataset.test;

export function MlView(props: MlViewProps) {
  const interactive = Boolean(props.onChange);
  const on = <T,>(handler: T): T | undefined =>
    interactive ? handler : undefined;
  const set = (patch: Partial<MlViewState>) => props.onChange?.(patch);

  const tabs: { key: MlTab; label: string }[] = [
    { key: "arena", label: "model arena" },
    { key: "threshold", label: "decision threshold" },
    { key: "fit", label: "over/underfitting" },
  ];

  return (
    <div className="ml">
      <div className="ml-tabs" role="tablist" aria-label="ML laboratory views">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`${props.idBase}-tab-${tab.key}`}
            type="button"
            role="tab"
            className="sql-chip"
            aria-selected={props.tab === tab.key}
            aria-controls={`${props.idBase}-panel`}
            disabled={!interactive}
            onClick={on(() => set({ tab: tab.key, cell: null }))}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`${props.idBase}-panel`}
        role="tabpanel"
        aria-labelledby={`${props.idBase}-tab-${props.tab}`}
        className="ml-panel"
      >
        {props.tab === "arena" && <Arena {...props} on={on} set={set} />}
        {props.tab === "threshold" && (
          <Threshold {...props} on={on} set={set} />
        )}
        {props.tab === "fit" && <Fit {...props} on={on} set={set} />}
      </div>
    </div>
  );
}

interface PanelProps extends MlViewProps {
  on: <T>(handler: T) => T | undefined;
  set: (patch: Partial<MlViewState>) => void;
}

function ConfusionGrid({
  confusion,
  cell,
  on,
  set,
  interactive,
}: {
  confusion: Confusion;
  cell: CellKey | null;
  on: PanelProps["on"];
  set: PanelProps["set"];
  interactive: boolean;
}) {
  const active = CELLS.find((c) => c.key === cell);
  return (
    <div className="ml-confusion">
      <div className="ml-axis ml-axis-top" aria-hidden="true">
        <span />
        <span>predicted repay</span>
        <span>predicted default</span>
      </div>
      <div className="ml-grid">
        <span className="ml-axis-side" aria-hidden="true">
          actual repay
        </span>
        {CELLS.slice(0, 2).map((c) => (
          <Cell
            key={c.key}
            c={c}
            n={confusion[c.key]}
            {...{ cell, on, set, interactive }}
          />
        ))}
        <span className="ml-axis-side" aria-hidden="true">
          actual default
        </span>
        {CELLS.slice(2).map((c) => (
          <Cell
            key={c.key}
            c={c}
            n={confusion[c.key]}
            {...{ cell, on, set, interactive }}
          />
        ))}
      </div>
      <p className="ml-explain" aria-live="polite">
        {active
          ? `${active.label} · ${confusion[active.key]} borrowers ${active.meaning}.`
          : "hover or focus a cell to see what it means for a lender."}
      </p>
    </div>
  );
}

function Cell({
  c,
  n,
  cell,
  on,
  set,
  interactive,
}: {
  c: (typeof CELLS)[number];
  n: number;
  cell: CellKey | null;
  on: PanelProps["on"];
  set: PanelProps["set"];
  interactive: boolean;
}) {
  return (
    <button
      type="button"
      className="ml-cell"
      data-kind={c.key}
      data-active={cell === c.key}
      disabled={!interactive}
      aria-label={`${c.label}: ${n} borrowers ${c.meaning}`}
      onMouseEnter={on(() => set({ cell: c.key }))}
      onFocus={on(() => set({ cell: c.key }))}
      onMouseLeave={on(() => set({ cell: null }))}
      onBlur={on(() => set({ cell: null }))}
    >
      <span className="ml-cell-label">{c.label}</span>
      <span className="ml-cell-n">{n}</span>
      <Meter value={n / total} className="ml-cell-bar" />
    </button>
  );
}

/** A proportional bar drawn in CSS, so it aligns to the text grid exactly. */
function Meter({ value, className }: { value: number; className?: string }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <span
      className={["ml-meter", className].filter(Boolean).join(" ")}
      style={{ "--v": v } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

function MetricLines({ rows }: { rows: [string, number][] }) {
  return (
    <div className="ml-metrics" role="list">
      {rows.map(([label, value]) => (
        <div key={label} role="listitem" className="ml-metric">
          <span>{label.padEnd(12)}</span>
          <Meter value={value} />
          <span> {fmt(value)}</span>
        </div>
      ))}
    </div>
  );
}

function Arena(props: PanelProps) {
  const model =
    RINN.models.find((m) => m.key === props.model) ?? RINN.models[1]!;
  const ranked = [...RINN.models].sort(
    (a, b) => b[props.rankBy] - a[props.rankBy],
  );
  const interactive = Boolean(props.onChange);
  return (
    <>
      <p className="ml-lede">
        {RINN.dataset.loans} simulated microloans, {RINN.dataset.test} held out
        for testing ({RINN.dataset.testDefaults} of them defaulted). Six models,
        threshold 0.5.
      </p>
      <div className="ml-chips" role="radiogroup" aria-label="Model">
        {RINN.models.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            className="sql-chip"
            aria-checked={m.key === model.key}
            disabled={!interactive}
            onClick={props.on(() => props.set({ model: m.key, cell: null }))}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="ml-columns">
        <ConfusionGrid
          confusion={model.confusion}
          cell={props.cell}
          on={props.on}
          set={props.set}
          interactive={interactive}
        />
        <div>
          <MetricLines
            rows={[
              ["accuracy", model.accuracy],
              ["precision", model.precision],
              ["recall", model.recall],
              ["specificity", model.specificity],
              ["F1", model.f1],
              ["ROC-AUC", model.rocAuc],
            ]}
          />
          <p className="ml-note">
            catches {model.confusion.tp} of {RINN.dataset.testDefaults}{" "}
            defaulters
          </p>
        </div>
      </div>

      <div className="ml-rank">
        <div className="ml-chips" role="radiogroup" aria-label="Rank models by">
          <span className="t-muted">rank by</span>
          {(Object.keys(RANK_LABELS) as RankBy[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              className="sql-chip"
              aria-checked={props.rankBy === key}
              disabled={!interactive}
              onClick={props.on(() => props.set({ rankBy: key }))}
            >
              {RANK_LABELS[key]}
            </button>
          ))}
        </div>
        <ol className="ml-metrics ml-board">
          {ranked.map((m, i) => (
            <li
              key={m.key}
              className="ml-metric"
              data-baseline={m.key === "baseline"}
            >
              <span>{`${String(i + 1).padStart(2)}. ${m.label.padEnd(24)}`}</span>
              <Meter value={m[props.rankBy]} />
              <span> {fmt(m[props.rankBy])}</span>
            </li>
          ))}
        </ol>
        <p className="ml-note">
          the do-nothing baseline scores{" "}
          {(RINN.models[0]!.accuracy * 100).toFixed(0)}% accuracy and catches 0
          defaulters, which is why accuracy alone misleads here.
        </p>
      </div>
    </>
  );
}

function Threshold(props: PanelProps) {
  const current = RINN.thresholds.find((t) => t.t === props.threshold)!;
  const other = RINN.thresholds.find((t) => t.t !== props.threshold)!;
  const interactive = Boolean(props.onChange);
  const caught = current.confusion.tp - other.confusion.tp;
  const alarms = current.confusion.fp - other.confusion.fp;
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  return (
    <>
      <p className="ml-lede">
        Logistic regression outputs a probability of default; the threshold
        turns it into a decision. The study evaluated two.
      </p>
      <div className="ml-chips" role="radiogroup" aria-label="Threshold">
        {RINN.thresholds.map((t) => (
          <button
            key={t.t}
            type="button"
            role="radio"
            className="sql-chip"
            aria-checked={t.t === props.threshold}
            disabled={!interactive}
            onClick={props.on(() =>
              props.set({ threshold: t.t as 0.5 | 0.3, cell: null }),
            )}
          >
            flag if p(default) ≥ {t.t}
          </button>
        ))}
      </div>
      <div className="ml-columns">
        <ConfusionGrid
          confusion={current.confusion}
          cell={props.cell}
          on={props.on}
          set={props.set}
          interactive={interactive}
        />
        <div>
          <MetricLines
            rows={[
              ["precision", current.precision],
              ["recall", current.recall],
            ]}
          />
          <p className="ml-note">
            vs threshold {other.t}: {sign(caught)} defaulters caught (
            {other.confusion.tp} → {current.confusion.tp}), {sign(alarms)} good
            borrowers flagged ({other.confusion.fp} → {current.confusion.fp}).
          </p>
        </div>
      </div>
    </>
  );
}

function Fit(props: PanelProps) {
  const points = props.sweep === "knn" ? RINN.knnSweep : RINN.depthSweep;
  const index = Math.min(props.sweepIndex, points.length - 1);
  const point = points[index]!;
  const best = points.reduce((a, b) => (b.val > a.val ? b : a));
  const { label, param } = SWEEPS[props.sweep];
  const interactive = Boolean(props.onChange);
  return (
    <>
      <p className="ml-lede">
        F1 on the data a model was fit on (*) against held-out validation data
        (o). A wide gap means the model memorised rather than learned.
      </p>
      <div className="ml-chips" role="radiogroup" aria-label="Model family">
        {(Object.keys(SWEEPS) as SweepKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            className="sql-chip"
            aria-checked={props.sweep === key}
            disabled={!interactive}
            onClick={props.on(() => props.set({ sweep: key, sweepIndex: 0 }))}
          >
            {SWEEPS[key].label}
          </button>
        ))}
      </div>
      <pre className="ml-chart" aria-hidden="true">
        {sweepChart(points, index).join("\n")}
      </pre>
      <label className="ml-slider">
        <span>
          {param} = <strong>{point.x}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={points.length - 1}
          step={1}
          value={index}
          disabled={!interactive}
          aria-valuetext={`${param} ${point.x}`}
          onChange={props.on((e: React.ChangeEvent<HTMLInputElement>) =>
            props.set({ sweepIndex: Number(e.target.value) }),
          )}
          readOnly={!interactive}
        />
      </label>
      <p className="ml-note" aria-live="polite">
        {label}, {param} = {point.x}: fit F1 {fmt(point.fit)} · validation F1{" "}
        {fmt(point.val)} · gap {fmt(point.fit - point.val)}. Best on validation:{" "}
        {param} = {best.x} ({fmt(best.val)}).
      </p>
    </>
  );
}

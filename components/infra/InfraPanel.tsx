// Presentational controls, stats and event log (no hooks, no "use client"):
// rendered by the server as the static fallback and by InfraLab when live.
import type React from "react";
import { PARAMS, type SimEvent } from "./sim";

export interface InfraStats {
  rps: number;
  inService: number;
  desired: number;
  cpu: number;
  latencyMs: number;
  availability: number;
  dropped: number;
  deploying: boolean;
  events: SimEvent[];
}

export interface InfraPanelProps {
  idBase: string;
  stats: InfraStats;
  baseRps: number;
  onTraffic?: (rps: number) => void;
  onSpike?: () => void;
  onDeploy?: () => void;
  onKill?: () => void;
  onReset?: () => void;
}

export function InfraPanel(props: InfraPanelProps) {
  const live = Boolean(props.onReset);
  const { stats } = props;
  const rows: [string, string][] = [
    ["requests/s", String(Math.round(stats.rps))],
    ["in service", `${stats.inService} / ${stats.desired} desired`],
    ["avg CPU", `${Math.round(stats.cpu * 100)}%`],
    ["p95 latency", `~${stats.latencyMs} ms`],
    ["availability", `${(stats.availability * 100).toFixed(2)}%`],
    ["dropped", String(Math.round(stats.dropped))],
  ];

  return (
    <div className="infra-panel">
      <div className="infra-controls">
        <label className="ml-slider" htmlFor={`${props.idBase}-rps`}>
          <span>
            baseline traffic <strong>{props.baseRps}</strong> req/s
          </span>
          <input
            id={`${props.idBase}-rps`}
            type="range"
            min={0}
            max={600}
            step={10}
            value={props.baseRps}
            disabled={!live}
            readOnly={!live}
            aria-valuetext={`${props.baseRps} requests per second`}
            onChange={
              live
                ? (e: React.ChangeEvent<HTMLInputElement>) =>
                    props.onTraffic?.(Number(e.target.value))
                : undefined
            }
          />
        </label>
        <div className="ml-chips">
          <button
            type="button"
            className="sql-chip"
            disabled={!live}
            onClick={props.onSpike}
          >
            traffic spike ×{PARAMS.spikeMultiplier}
          </button>
          <button
            type="button"
            className="sql-chip"
            disabled={!live || stats.deploying}
            onClick={props.onDeploy}
          >
            {stats.deploying ? "releasing…" : "deploy new version"}
          </button>
          <button
            type="button"
            className="sql-chip"
            disabled={!live}
            onClick={props.onKill}
          >
            crash an instance
          </button>
          <button
            type="button"
            className="sql-reset"
            disabled={!live}
            onClick={props.onReset}
          >
            reset
          </button>
        </div>
      </div>

      <dl className="infra-stats">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="infra-log-title" id={`${props.idBase}-log`}>
          event log
        </h3>
        <ol
          className="infra-log"
          aria-labelledby={`${props.idBase}-log`}
          aria-live="polite"
          aria-relevant="additions"
        >
          {stats.events.map((e) => (
            <li key={`${e.t}-${e.text}`}>
              <span className="t-muted">t+{e.t.toFixed(1)}s</span> {e.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

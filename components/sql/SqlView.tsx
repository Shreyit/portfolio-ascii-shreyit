import type React from "react";
// Presentational only (no hooks, no "use client"): rendered by the server as
// the static fallback, and by the lazily loaded SqlPlayground with handlers.
import { showCell, type Cell } from "./format";
import { PRESETS, TABLES } from "./schema";

export interface SqlViewResult {
  columns: string[];
  rows: Cell[][];
}

export interface SqlViewProps {
  headingId: string;
  counts: Record<string, number>;
  query: string;
  status: string;
  error: string | null;
  result: SqlViewResult | null;
  busy?: boolean;
  /** The editor holds a query that has not been run yet. */
  pending?: boolean;
  activeTable?: string | null;
  onQueryChange?: (sql: string) => void;
  onRun?: () => void;
  onReset?: () => void;
  onPreset?: (sql: string) => void;
  onSelectTable?: (table: string) => void;
  onHoverTable?: (table: string | null) => void;
}

/** Tables joined to `name` by a foreign key, in either direction. */
export function relatedTables(name: string): Set<string> {
  const related = new Set<string>();
  for (const t of TABLES) {
    for (const c of t.columns) {
      const target = c.ref?.split(".")[0];
      if (t.name === name && target) related.add(target);
      if (target === name) related.add(t.name);
    }
  }
  return related;
}

export function SqlView(props: SqlViewProps) {
  const interactive = Boolean(props.onRun);
  // The server-rendered fallback must not carry event handlers.
  const on = <T,>(handler: T): T | undefined =>
    interactive ? handler : undefined;
  const related = props.activeTable
    ? relatedTables(props.activeTable)
    : new Set<string>();

  return (
    <div className="sql">
      <div className="sql-schema">
        <p className="sql-label">schema · {TABLES.length} tables</p>
        <div className="sql-tables" role="list" aria-label="Database tables">
          {TABLES.map((table) => {
            const rows = props.counts[table.name] ?? 0;
            return (
              <div key={table.name} role="listitem" className="sql-table-item">
                <button
                  type="button"
                  className="sql-card"
                  data-active={props.activeTable === table.name}
                  data-related={related.has(table.name)}
                  disabled={!interactive}
                  onClick={on(() => props.onSelectTable?.(table.name))}
                  onMouseEnter={on(() => props.onHoverTable?.(table.name))}
                  onMouseLeave={on(() => props.onHoverTable?.(null))}
                  onFocus={on(() => props.onHoverTable?.(table.name))}
                  onBlur={on(() => props.onHoverTable?.(null))}
                >
                  <span className="sql-card-head">
                    <span className="sql-card-name">{table.name}</span>
                    <span className="sql-card-rows">
                      {rows} row{rows === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="sql-card-cols" aria-hidden="true">
                    {table.columns.map((c) => (
                      <span key={c.name} className="sql-col">
                        <span className="sql-col-name">{c.name}</span>
                        <span className="sql-col-type">{c.type}</span>
                        <span className="sql-col-tag">
                          {c.pk
                            ? "PK"
                            : c.ref
                              ? `-> ${c.ref.split(".")[0]}`
                              : ""}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="sql-card-desc">{table.description}</span>
                  <span className="visually-hidden">
                    {`. Columns: ${table.columns.map((c) => c.name).join(", ")}. Load a query for this table.`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sql-console">
        <p className="sql-label">example queries</p>
        <div className="sql-presets" aria-label="Example queries">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="sql-chip"
              disabled={!interactive}
              aria-pressed={props.query === preset.sql}
              onClick={on(() => props.onPreset?.(preset.sql))}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label
          htmlFor={`${props.headingId}-editor`}
          className="visually-hidden"
        >
          SQL query
        </label>
        <div className="sql-editor-wrap" data-pending={props.pending ?? false}>
          <span className="sql-editor-prompt" aria-hidden="true">
            sqlite&gt;
          </span>
          <textarea
            id={`${props.headingId}-editor`}
            className="sql-editor"
            value={props.query}
            readOnly={!interactive}
            rows={7}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            data-lenis-prevent
            onChange={on((event: React.ChangeEvent<HTMLTextAreaElement>) =>
              props.onQueryChange?.(event.target.value),
            )}
            onKeyDown={on((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                props.onRun?.();
              }
            })}
          />
        </div>

        <div className="sql-actions">
          <button
            type="button"
            className="sql-run"
            data-pending={props.pending ?? false}
            aria-busy={props.busy ?? false}
            disabled={!interactive || props.busy}
            onClick={props.onRun}
          >
            {props.busy ? "running…" : "run"}{" "}
            <span className="sql-kbd" aria-hidden="true">
              ⌘/ctrl ↵
            </span>
          </button>
          <button
            type="button"
            className="sql-reset"
            disabled={!interactive || props.busy}
            onClick={props.onReset}
          >
            reset db
          </button>
          <span className="sql-status" role="status" aria-live="polite">
            {props.status}
          </span>
        </div>

        {props.error && (
          <p className="sql-error" role="alert">
            {props.error}
          </p>
        )}

        {props.result && (
          <div
            className="sql-result"
            data-lenis-prevent
            tabIndex={0}
            aria-label="Query result"
          >
            <table>
              <thead>
                <tr>
                  {props.result.columns.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.result.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        data-numeric={typeof cell === "number"}
                        data-null={cell === null}
                      >
                        {showCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

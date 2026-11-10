import type React from "react";
// Presentational only (no hooks, no "use client"): rendered by the server as
// the static fallback, and by the lazily loaded SqlPlayground with handlers.
import type { Cell } from "./format";
import { PRESETS, TABLES, type TableDef } from "./schema";

export interface SqlViewResult {
  lines: string[];
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
  activeTable?: string | null;
  onQueryChange?: (sql: string) => void;
  onRun?: () => void;
  onReset?: () => void;
  onPreset?: (sql: string) => void;
  onSelectTable?: (table: string) => void;
  onHoverTable?: (table: string | null) => void;
}

export function tableBox(table: TableDef, rows: number | undefined): string[] {
  const nameWidth = Math.max(...table.columns.map((c) => c.name.length)) + 2;
  const body = table.columns.map((c) => {
    const tag = c.pk ? "PK" : c.ref ? `→ ${c.ref.split(".")[0]}` : "";
    return [c.name.padEnd(nameWidth), c.type.padEnd(8), tag].join("").trimEnd();
  });
  const footer =
    rows === undefined ? "" : ` ${rows} row${rows === 1 ? "" : "s"} `;
  const width = Math.max(
    table.name.length + 4,
    footer.length + 2,
    ...body.map((b) => b.length),
  );
  const top = `┌─ ${table.name} ${"─".repeat(width - table.name.length - 1)}┐`;
  const bottom = `└${"─".repeat(width + 1 - footer.length)}${footer}─┘`;
  return [top, ...body.map((b) => `│ ${b.padEnd(width)} │`), bottom];
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
      <div className="sql-tables" role="list" aria-label="Database tables">
        {TABLES.map((table) => {
          const box = tableBox(table, props.counts[table.name]).join("\n");
          const active = props.activeTable === table.name;
          return (
            <div key={table.name} role="listitem" className="sql-table-item">
              <button
                type="button"
                className="sql-table"
                data-active={active}
                data-related={related.has(table.name)}
                disabled={!interactive}
                onClick={on(() => props.onSelectTable?.(table.name))}
                onMouseEnter={on(() => props.onHoverTable?.(table.name))}
                onMouseLeave={on(() => props.onHoverTable?.(null))}
                onFocus={on(() => props.onHoverTable?.(table.name))}
                onBlur={on(() => props.onHoverTable?.(null))}
              >
                <span className="visually-hidden">
                  {`${table.name}: ${table.description}, ${props.counts[table.name] ?? 0} rows. Query this table.`}
                </span>
                <pre aria-hidden="true">{box}</pre>
              </button>
              <p className="sql-table-desc">{table.description}</p>
            </div>
          );
        })}
      </div>

      <div className="sql-console">
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

        <div className="sql-actions">
          <button
            type="button"
            className="sql-run"
            disabled={!interactive || props.busy}
            onClick={props.onRun}
          >
            run <span className="t-muted">⌘/ctrl ↵</span>
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
            <pre aria-hidden="true">{props.result.lines.join("\n")}</pre>
            <table className="visually-hidden">
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
                      <td key={j}>{cell === null ? "NULL" : String(cell)}</td>
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

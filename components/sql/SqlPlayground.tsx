"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SqlClient } from "./client";
import { formatTable } from "./format";
import { PRESETS, type Statement } from "./schema";
import { SqlView, type SqlViewResult } from "./SqlView";

interface SqlPlaygroundProps {
  headingId: string;
  statements: Statement[];
  counts: Record<string, number>;
}

const IDLE = "database boots on first run (~300 KB of WebAssembly)";

export default function SqlPlayground({
  headingId,
  statements,
  counts,
}: SqlPlaygroundProps) {
  const client = useRef<SqlClient | null>(null);
  const [query, setQuery] = useState(PRESETS[0]!.sql);
  const [status, setStatus] = useState(IDLE);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SqlViewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTable, setActiveTable] = useState<string | null>(null);

  useEffect(() => {
    const instance = new SqlClient(statements);
    client.current = instance;
    return () => instance.dispose();
  }, [statements]);

  const run = useCallback(async (sql: string) => {
    const instance = client.current;
    if (!instance || !sql.trim()) return;
    setBusy(true);
    setError(null);
    setStatus("booting sqlite…");
    try {
      await instance.boot();
      setStatus("running…");
      const r = await instance.query(sql);
      setResult(
        r.columns.length
          ? {
              lines: formatTable(r.columns, r.rows),
              columns: r.columns,
              rows: r.rows,
            }
          : null,
      );
      const shown =
        r.rows.length < r.totalRows ? ` (showing ${r.rows.length})` : "";
      setStatus(
        r.columns.length
          ? `${r.totalRows} row${r.totalRows === 1 ? "" : "s"}${shown} · ${r.ms.toFixed(1)} ms`
          : `ok · ${r.changes} row${r.changes === 1 ? "" : "s"} changed · ${r.ms.toFixed(1)} ms`,
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setBusy(true);
    setStatus("resetting…");
    try {
      await client.current?.reset();
      setStatus("database restored from the portfolio");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <SqlView
      headingId={headingId}
      counts={counts}
      query={query}
      status={status}
      error={error}
      result={result}
      busy={busy}
      activeTable={activeTable}
      onQueryChange={setQuery}
      onRun={() => void run(query)}
      onReset={() => void reset()}
      onPreset={(sql) => {
        setQuery(sql);
        void run(sql);
      }}
      onSelectTable={(table) => {
        const sql = `SELECT *\nFROM ${table}\nLIMIT 10;`;
        setQuery(sql);
        void run(sql);
      }}
      onHoverTable={setActiveTable}
    />
  );
}

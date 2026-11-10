/// <reference lib="webworker" />
// SQLite (sql.js / WebAssembly) in a worker, so a runaway query can be
// terminated by the page without freezing it.
import initSqlJs, { type Database } from "sql.js";
import type { WorkerRequest, WorkerResponse } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

let db: Database | null = null;

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      const SQL = await initSqlJs({ locateFile: () => message.wasmUrl });
      db?.close();
      db = new SQL.Database();
      db.run(message.ddl);
      db.run("BEGIN");
      for (const statement of message.statements) {
        db.run(statement.sql, statement.params);
      }
      db.run("COMMIT");
      post({ type: "ready" });
      return;
    }

    if (!db) throw new Error("database not ready");
    const start = performance.now();
    const results = db.exec(message.sql);
    const last = results.at(-1);
    post({
      type: "result",
      id: message.id,
      columns: last?.columns ?? [],
      rows: (last?.values ?? []).slice(0, message.maxRows),
      totalRows: last?.values.length ?? 0,
      changes: db.getRowsModified(),
      ms: performance.now() - start,
    });
  } catch (error) {
    post({
      type: "error",
      id: message.type === "exec" ? message.id : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

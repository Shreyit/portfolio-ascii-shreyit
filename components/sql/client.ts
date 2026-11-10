import type { Cell } from "./format";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { ddl, type Statement } from "./schema";

export const WASM_URL = "/vendor/sql-wasm.wasm";
export const QUERY_TIMEOUT_MS = 3000;
export const MAX_ROWS = 200;

export interface QueryResult {
  columns: string[];
  rows: Cell[][];
  totalRows: number;
  changes: number;
  ms: number;
}

/**
 * Owns the SQLite worker. A query that runs past the timeout (an infinite
 * recursive CTE, say) terminates the worker; the next call boots a fresh
 * database from the seed, so the page never freezes.
 */
export class SqlClient {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private nextId = 1;
  private readonly statements: Statement[];

  constructor(statements: Statement[]) {
    this.statements = statements;
  }

  boot(): Promise<void> {
    this.ready ??= new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL("./sql.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === "ready") resolve();
        else if (event.data.type === "error")
          reject(new Error(event.data.message));
      };
      worker.onerror = (event) =>
        reject(new Error(event.message || "worker failed"));
      this.send({
        type: "init",
        wasmUrl: WASM_URL,
        ddl: ddl(),
        statements: this.statements,
      });
    }).catch((error: unknown) => {
      this.dispose();
      throw error;
    });
    return this.ready;
  }

  async query(sql: string): Promise<QueryResult> {
    await this.boot();
    const worker = this.worker!;
    const id = this.nextId++;
    return new Promise<QueryResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        this.dispose(); // kill the runaway query; next call reseeds
        reject(new Error(`query cancelled after ${QUERY_TIMEOUT_MS / 1000}s`));
      }, QUERY_TIMEOUT_MS);
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (data.type === "ready" || data.id !== id) return;
        cleanup();
        if (data.type === "error") reject(new Error(data.message));
        else resolve(data);
      };
      const cleanup = () => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
      };
      worker.addEventListener("message", onMessage);
      this.send({ type: "exec", id, sql, maxRows: MAX_ROWS });
    });
  }

  /** Throws away the visitor's changes and rebuilds from the seed. */
  async reset(): Promise<void> {
    this.dispose();
    await this.boot();
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }

  private send(message: WorkerRequest): void {
    this.worker?.postMessage(message);
  }
}

import type { Cell } from "./format";
import type { Statement } from "./schema";

export type WorkerRequest =
  | { type: "init"; wasmUrl: string; ddl: string; statements: Statement[] }
  | { type: "exec"; id: number; sql: string; maxRows: number };

export type WorkerResponse =
  | { type: "ready" }
  | {
      type: "result";
      id: number;
      columns: string[];
      rows: Cell[][];
      totalRows: number;
      changes: number;
      ms: number;
    }
  | { type: "error"; id?: number; message: string };

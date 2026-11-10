export type Cell = string | number | null | Uint8Array;

/** How a SQLite value is shown in the results table. */
export function showCell(value: Cell): string {
  if (value === null) return "NULL";
  if (value instanceof Uint8Array) return `<blob ${value.length}B>`;
  return String(value);
}

export type Cell = string | number | null | Uint8Array;

function show(value: Cell): string {
  if (value === null) return "NULL";
  if (value instanceof Uint8Array) return `<blob ${value.length}B>`;
  return String(value).replace(/\s+/g, " ");
}

function clip(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text;
}

/**
 * Renders a result set as a box-drawn ASCII table. Long cells are clipped
 * to `maxCellWidth` so one long value cannot blow the layout up.
 */
export function formatTable(
  columns: string[],
  rows: Cell[][],
  maxCellWidth = 48,
): string[] {
  if (!columns.length) return [];
  const cells = rows.map((row) =>
    columns.map((_, i) => clip(show(row[i] ?? null), maxCellWidth)),
  );
  const head = columns.map((c) => clip(c, maxCellWidth));
  const widths = head.map((h, i) =>
    Math.max(h.length, ...cells.map((r) => r[i]!.length)),
  );
  const numeric = columns.map(
    (_, i) =>
      rows.length > 0 &&
      rows.every((r) => r[i] === null || typeof r[i] === "number"),
  );
  const rule = (l: string, m: string, r: string) =>
    l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;
  const line = (values: string[]) =>
    "│" +
    values
      .map((v, i) =>
        numeric[i]
          ? ` ${v.padStart(widths[i]!)} `
          : ` ${v.padEnd(widths[i]!)} `,
      )
      .join("│") +
    "│";

  return [
    rule("┌", "┬", "┐"),
    line(head),
    rule("├", "┼", "┤"),
    ...cells.map(line),
    rule("└", "┴", "┘"),
  ];
}

export interface SweepPoint {
  x: number;
  fit: number;
  val: number;
}

/**
 * Plots two series (fit "*" vs validation "o", "@" where they meet) on a
 * character grid, using plain ASCII so every mark is exactly one cell wide. Columns are
 * evenly spaced per sweep point; `selected` marks a column with a cursor.
 * Returns rows top-to-bottom, with a y-axis on the left and x labels below.
 */
export function sweepChart(
  points: readonly SweepPoint[],
  selected: number,
  height = 8,
  colWidth = 4,
): string[] {
  const width = points.length * colWidth;
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => " "),
  );
  const rowFor = (v: number) =>
    height - 1 - Math.round(Math.min(1, Math.max(0, v)) * (height - 1));

  points.forEach((p, i) => {
    const col = i * colWidth + Math.floor(colWidth / 2);
    if (i === selected) {
      for (let r = 0; r < height; r += 1) grid[r]![col] = ":";
    }
    const fitRow = rowFor(p.fit);
    const valRow = rowFor(p.val);
    grid[fitRow]![col] = "*";
    grid[valRow]![col] = fitRow === valRow ? "@" : "o";
  });

  const rows = grid.map((cells, r) => {
    const label =
      r === 0
        ? "1.0"
        : r === height - 1
          ? "0.0"
          : r === Math.floor((height - 1) / 2)
            ? "0.5"
            : "   ";
    return `${label} ┤${cells.join("")}`;
  });
  const axis = `    └${"─".repeat(width)}`;
  const labels =
    "     " +
    points
      .map((p) =>
        String(p.x)
          .padStart(Math.ceil(colWidth / 2) + 1)
          .padEnd(colWidth),
      )
      .join("");
  return [...rows, axis, labels.trimEnd()];
}

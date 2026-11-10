import type { TerminalData } from "@/components/terminal/types";
import { SqlIsland } from "./SqlIsland";
import { PRESETS, TABLES, seed } from "./schema";
import { SqlView } from "./SqlView";

const HEADING_ID = "sql-heading";

export function SqlSection({ data }: { data: TerminalData }) {
  const statements = seed(data);
  const counts: Record<string, number> = Object.fromEntries(
    TABLES.map((t) => [t.name, 0]),
  );
  for (const s of statements) {
    const table = /^INSERT INTO (\w+)/.exec(s.sql)?.[1];
    if (table) counts[table] = (counts[table] ?? 0) + 1;
  }

  return (
    <section className="lab-section" aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>SQL playground</h2>
      <p className="lab-intro">
        This portfolio, as a real SQLite database running in your browser. Hover
        a table, pick a query or write your own. It is your copy: drop tables if
        you like, then reset.
      </p>
      <SqlIsland headingId={HEADING_ID} statements={statements} counts={counts}>
        <SqlView
          headingId={HEADING_ID}
          counts={counts}
          query={PRESETS[0]!.sql}
          status="loading playground…"
          error={null}
          result={null}
        />
      </SqlIsland>
    </section>
  );
}

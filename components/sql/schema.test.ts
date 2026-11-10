// @vitest-environment node
import initSqlJs, { type Database } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  certifications,
  education,
  experience,
  extracurriculars,
  profile,
  projects,
  research,
  skills,
} from "@/content";
import type { TerminalData } from "@/components/terminal/types";
import { formatTable } from "./format";
import { PRESETS, TABLES, ddl, seed } from "./schema";
import { relatedTables, tableBox } from "./SqlView";

const data: TerminalData = {
  profile,
  education,
  experience,
  projects,
  research,
  skills,
  extracurriculars,
  certifications,
};

let db: Database;

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run("PRAGMA foreign_keys = ON");
  db.run(ddl());
  for (const s of seed(data)) db.run(s.sql, s.params);
});

const scalar = (sql: string) => db.exec(sql)[0]!.values[0]![0];

describe("seeded database", () => {
  it("creates every table and respects foreign keys", () => {
    for (const t of TABLES) {
      expect(scalar(`SELECT COUNT(*) FROM ${t.name}`)).toBeGreaterThanOrEqual(
        0,
      );
    }
    expect(db.exec("PRAGMA foreign_key_check")).toEqual([]);
  });

  it("mirrors the public content exactly", () => {
    expect(scalar("SELECT COUNT(*) FROM projects")).toBe(projects.length);
    expect(scalar("SELECT COUNT(*) FROM fieldwork")).toBe(research.length);
    expect(scalar("SELECT COUNT(*) FROM skills")).toBe(skills.length);
    expect(
      scalar("SELECT n FROM samples WHERE label = 'residents surveyed'"),
    ).toBe(231);
    const bullets = db.exec("SELECT text FROM highlights")[0]!.values.flat();
    for (const p of projects) {
      for (const h of p.highlights) expect(bullets).toContain(h);
    }
  });

  it("contains no unreviewed or private repositories", () => {
    const dump = JSON.stringify(
      TABLES.map((t) => db.exec(`SELECT * FROM ${t.name}`)),
    );
    for (const hidden of [
      "brsr_tool",
      "cdp_analysis",
      "my-neovim-ds-config",
      "SANKHYA-Timeline",
    ]) {
      expect(dump).not.toContain(hidden);
    }
  });

  it("runs every preset query", () => {
    for (const preset of PRESETS) {
      const result = db.exec(preset.sql);
      expect(result.length, preset.label).toBeGreaterThan(0);
      expect(result[0]!.values.length, preset.label).toBeGreaterThan(0);
    }
  });
});

describe("formatTable", () => {
  it("draws a box, right-aligns numbers and clips long cells", () => {
    const lines = formatTable(
      ["name", "n"],
      [
        ["a", 5],
        ["bbbbbbbbbb", 123],
        [null, null],
      ],
      6,
    );
    expect(lines).toEqual([
      "┌────────┬──────┐",
      "│ name   │    n │",
      "├────────┼──────┤",
      "│ a      │    5 │",
      "│ bbbbb… │  123 │",
      "│ NULL   │ NULL │",
      "└────────┴──────┘",
    ]);
    expect(new Set(lines.map((l) => l.length)).size).toBe(1);
  });
});

describe("diagram", () => {
  it("draws equal-width boxes and finds foreign-key neighbours", () => {
    for (const t of TABLES) {
      const box = tableBox(t, 3);
      expect(new Set(box.map((l) => l.length)).size).toBe(1);
      expect(box[0]).toContain(t.name);
    }
    expect(relatedTables("projects")).toEqual(
      new Set(["project_pillars", "project_stack", "highlights"]),
    );
    expect(relatedTables("samples")).toEqual(new Set(["fieldwork"]));
  });
});

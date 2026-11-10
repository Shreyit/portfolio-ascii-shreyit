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
import { showCell } from "./format";
import { PRESETS, TABLES, ddl, seed } from "./schema";
import { relatedTables } from "./SqlView";

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

describe("showCell", () => {
  it("shows NULLs, numbers and blobs readably", () => {
    expect(showCell(null)).toBe("NULL");
    expect(showCell(42)).toBe("42");
    expect(showCell("a b")).toBe("a b");
    expect(showCell(new Uint8Array(3))).toBe("<blob 3B>");
  });
});

describe("diagram", () => {
  it("finds foreign-key neighbours", () => {
    expect(relatedTables("projects")).toEqual(
      new Set(["project_pillars", "project_stack", "highlights"]),
    );
    expect(relatedTables("samples")).toEqual(new Set(["fieldwork"]));
  });
});

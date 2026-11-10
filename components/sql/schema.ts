import type { TerminalData } from "@/components/terminal/types";

export interface ColumnDef {
  name: string;
  type: "TEXT" | "INTEGER";
  pk?: boolean;
  /** Foreign key target as "table.column". */
  ref?: string;
  nullable?: boolean;
}

export interface TableDef {
  name: string;
  description: string;
  columns: ColumnDef[];
}

export const TABLES: TableDef[] = [
  {
    name: "projects",
    description: "one row per public project",
    columns: [
      { name: "slug", type: "TEXT", pk: true },
      { name: "title", type: "TEXT" },
      { name: "started", type: "TEXT", nullable: true },
      { name: "ended", type: "TEXT", nullable: true },
      { name: "domain", type: "TEXT", nullable: true },
      { name: "featured", type: "INTEGER" },
      { name: "repo", type: "TEXT", nullable: true },
      { name: "live", type: "TEXT", nullable: true },
    ],
  },
  {
    name: "project_pillars",
    description: "which areas a project belongs to",
    columns: [
      { name: "project_slug", type: "TEXT", ref: "projects.slug" },
      { name: "pillar", type: "TEXT" },
    ],
  },
  {
    name: "project_stack",
    description: "technologies used per project",
    columns: [
      { name: "project_slug", type: "TEXT", ref: "projects.slug" },
      { name: "tech", type: "TEXT" },
    ],
  },
  {
    name: "highlights",
    description: "resume bullets, verbatim",
    columns: [
      { name: "project_slug", type: "TEXT", ref: "projects.slug" },
      { name: "n", type: "INTEGER" },
      { name: "text", type: "TEXT" },
    ],
  },
  {
    name: "experience",
    description: "roles held",
    columns: [
      { name: "slug", type: "TEXT", pk: true },
      { name: "role", type: "TEXT" },
      { name: "organisation", type: "TEXT" },
      { name: "location", type: "TEXT", nullable: true },
      { name: "started", type: "TEXT", nullable: true },
      { name: "ended", type: "TEXT", nullable: true },
    ],
  },
  {
    name: "fieldwork",
    description: "field research studies",
    columns: [
      { name: "slug", type: "TEXT", pk: true },
      { name: "title", type: "TEXT" },
      { name: "partner", type: "TEXT" },
      { name: "location", type: "TEXT" },
      { name: "started", type: "TEXT", nullable: true },
      { name: "ended", type: "TEXT", nullable: true },
    ],
  },
  {
    name: "samples",
    description: "who was surveyed, and how many",
    columns: [
      { name: "fieldwork_slug", type: "TEXT", ref: "fieldwork.slug" },
      { name: "label", type: "TEXT" },
      { name: "n", type: "INTEGER" },
    ],
  },
  {
    name: "skills",
    description: "skills, grouped as on the resume",
    columns: [
      { name: "name", type: "TEXT", pk: true },
      { name: "category", type: "TEXT" },
      { name: "lab", type: "TEXT", nullable: true },
    ],
  },
];

export interface Statement {
  sql: string;
  params: (string | number | null)[];
}

export function ddl(): string {
  return TABLES.map((t) => {
    const cols = t.columns.map((c) =>
      [
        c.name,
        c.type,
        c.pk ? "PRIMARY KEY" : "",
        c.nullable || c.pk ? "" : "NOT NULL",
        c.ref
          ? `REFERENCES ${c.ref.split(".")[0]}(${c.ref.split(".")[1]})`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    return `CREATE TABLE ${t.name} (\n  ${cols.join(",\n  ")}\n);`;
  }).join("\n");
}

function insert(table: string, values: Statement["params"]): Statement {
  return {
    sql: `INSERT INTO ${table} VALUES (${values.map(() => "?").join(", ")})`,
    params: values,
  };
}

/** Rows for every table, built only from public (reviewed) content. */
export function seed(data: TerminalData): Statement[] {
  const rows: Statement[] = [];
  for (const p of data.projects) {
    rows.push(
      insert("projects", [
        p.slug,
        p.title,
        p.period.start,
        p.period.end,
        p.domain ?? null,
        p.featured ? 1 : 0,
        p.links.repo,
        p.links.live,
      ]),
    );
    for (const pillar of p.pillar) {
      rows.push(insert("project_pillars", [p.slug, pillar]));
    }
    for (const tech of p.stack) {
      rows.push(insert("project_stack", [p.slug, tech]));
    }
    p.highlights.forEach((text, i) => {
      rows.push(insert("highlights", [p.slug, i + 1, text]));
    });
  }
  for (const x of data.experience) {
    rows.push(
      insert("experience", [
        x.slug,
        x.role,
        x.organisation,
        x.location,
        x.period.start,
        x.period.end,
      ]),
    );
  }
  for (const r of data.research) {
    rows.push(
      insert("fieldwork", [
        r.slug,
        r.title,
        r.partner,
        r.location,
        r.period.start,
        r.period.end,
      ]),
    );
    for (const s of r.sample) {
      rows.push(insert("samples", [r.slug, s.label, s.n]));
    }
  }
  for (const s of data.skills) {
    rows.push(insert("skills", [s.name, s.category, s.experience ?? null]));
  }
  return rows;
}

export interface Preset {
  label: string;
  sql: string;
}

export const PRESETS: Preset[] = [
  {
    label: "projects per area",
    sql: `SELECT pillar, COUNT(*) AS projects
FROM project_pillars
GROUP BY pillar
ORDER BY projects DESC;`,
  },
  {
    label: "most used tech",
    sql: `SELECT tech, COUNT(*) AS projects
FROM project_stack
GROUP BY tech
ORDER BY projects DESC, tech
LIMIT 8;`,
  },
  {
    label: "fieldwork samples",
    sql: `SELECT f.title, s.label, s.n
FROM samples AS s
JOIN fieldwork AS f ON f.slug = s.fieldwork_slug
ORDER BY s.n DESC;`,
  },
  {
    label: "live projects",
    sql: `SELECT title, live
FROM projects
WHERE live IS NOT NULL
ORDER BY started DESC;`,
  },
  {
    label: "skills behind each lab",
    sql: `SELECT lab, GROUP_CONCAT(name, ', ') AS skills
FROM skills
WHERE lab IS NOT NULL
GROUP BY lab;`,
  },
  {
    label: "timeline",
    sql: `SELECT started, 'project' AS kind, title AS what FROM projects
UNION ALL
SELECT started, 'role', role || ' @ ' || organisation FROM experience
UNION ALL
SELECT started, 'fieldwork', title FROM fieldwork
ORDER BY started DESC;`,
  },
];

import type {
  Experience,
  ExperienceKey,
  Extracurricular,
  Project,
  ResearchEntry,
} from "@/content/schema";
import { tokenize } from "./parser";
import type {
  CommandContext,
  CommandResult,
  Line,
  Segment,
  TerminalData,
  Tone,
} from "./types";

// ---------------------------------------------------------------- helpers

const seg = (text: string, tone?: Tone): Segment =>
  tone ? { text, tone } : { text };
const cmd = (text: string, command = text): Segment => ({
  text,
  cmd: command,
  tone: "accent",
});
const link = (text: string, href: string): Segment => ({ text, href });
const out = (...lines: Line[]): CommandResult => ({ lines });
const error = (text: string): CommandResult => out([seg(text, "error")]);
const blank: Line = [];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function month(value: string): string {
  const [year, m] = value.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${year}`;
}

export function formatPeriod(period: {
  start: string | null;
  end: string | null;
}): string {
  const { start, end } = period;
  if (!start && !end) return "";
  if (start && !end) return `${month(start)} – present`;
  if (!start && end) return month(end);
  if (start === end) return month(start!);
  return `${month(start!)} – ${month(end!)}`;
}

const PILLAR_LABELS: Record<string, string> = {
  engineering: "engineering",
  ai: "ai",
  "data-science": "data science",
  research: "research",
  sustainability: "sustainability",
};

const LAB_TITLES: Record<ExperienceKey, string> = {
  terminal: "terminal",
  sql: "SQL playground",
  "ml-lab": "ML laboratory",
  infra: "infrastructure simulator",
  "research-explorer": "research & fieldwork explorer",
};

const bullet = (text: string): Line => [seg("  - ", "muted"), seg(text)];

function pad(text: string, width: number): string {
  return text.length >= width ? `${text} ` : text.padEnd(width);
}

// ---------------------------------------------------------------- entries

type Entry =
  | { kind: "project"; slug: string; title: string; item: Project }
  | { kind: "research"; slug: string; title: string; item: ResearchEntry }
  | { kind: "experience"; slug: string; title: string; item: Experience }
  | { kind: "activity"; slug: string; title: string; item: Extracurricular };

function entries(data: TerminalData): Entry[] {
  return [
    ...data.projects.map((item) => ({
      kind: "project" as const,
      slug: item.slug,
      title: item.title,
      item,
    })),
    ...data.research.map((item) => ({
      kind: "research" as const,
      slug: item.slug,
      title: item.title,
      item,
    })),
    ...data.experience.map((item) => ({
      kind: "experience" as const,
      slug: item.slug,
      title: `${item.role} — ${item.organisation}`,
      item,
    })),
    // Activities that only point at a project are reached via that project.
    ...data.extracurriculars
      .filter((item) => !item.projectSlug)
      .map((item) => ({
        kind: "activity" as const,
        slug: item.slug,
        title: `${item.role} — ${item.organisation}`,
        item,
      })),
  ];
}

type Resolved = { entry: Entry } | { ambiguous: Entry[] } | { missing: true };

export function resolveEntry(data: TerminalData, query: string): Resolved {
  const q = query.toLowerCase();
  const all = entries(data);
  const exact = all.find((e) => e.slug.toLowerCase() === q);
  if (exact) return { entry: exact };
  const matches = all.filter(
    (e) =>
      e.slug.toLowerCase().includes(q) || e.title.toLowerCase().includes(q),
  );
  if (matches.length === 1) return { entry: matches[0]! };
  if (matches.length > 1) return { ambiguous: matches };
  return { missing: true };
}

function describe(entry: Entry, data: TerminalData): Line[] {
  switch (entry.kind) {
    case "project": {
      const p = entry.item;
      const meta = [
        formatPeriod(p.period),
        p.pillar.map((x) => PILLAR_LABELS[x]).join(" · "),
        p.domain ?? "",
      ].filter(Boolean);
      return [
        [seg(p.title, "accent")],
        [seg(meta.join("  |  "), "muted")],
        ...(p.summary ? [blank, [seg(p.summary)]] : []),
        ...(p.highlights.length ? [blank, ...p.highlights.map(bullet)] : []),
        ...(p.stack.length
          ? [blank, [seg("stack  ", "muted"), seg(p.stack.join(", "))]]
          : []),
        ...linkLines(p.links),
      ];
    }
    case "research": {
      const r = entry.item;
      return [
        [seg(r.title, "accent")],
        [
          seg(
            [r.partner, r.location, formatPeriod(r.period)].join("  |  "),
            "muted",
          ),
        ],
        blank,
        [
          seg("sample   ", "muted"),
          seg(r.sample.map((s) => `n=${s.n} ${s.label}`).join("; ")),
        ],
        [seg("methods  ", "muted"), seg(r.methods.join("; "))],
        [seg("tools    ", "muted"), seg(r.tools.join(", "))],
        blank,
        ...r.findings.map(bullet),
      ];
    }
    case "experience": {
      const x = entry.item;
      return [
        [seg(`${x.role} @ ${x.organisation}`, "accent")],
        [
          seg(
            [x.location, formatPeriod(x.period)].filter(Boolean).join("  |  "),
            "muted",
          ),
        ],
        blank,
        ...x.highlights.map(bullet),
      ];
    }
    case "activity": {
      const a = entry.item;
      const project = a.projectSlug
        ? data.projects.find((p) => p.slug === a.projectSlug)
        : undefined;
      return [
        [seg(`${a.role} — ${a.organisation}`, "accent")],
        [seg(formatPeriod(a.period), "muted")],
        ...(a.details.length ? [blank, ...a.details.map(bullet)] : []),
        ...(project
          ? [[seg("see    ", "muted"), cmd(`cat ${project.slug}`)]]
          : []),
        ...(a.links?.live ? linkLines({ repo: null, live: a.links.live }) : []),
      ];
    }
  }
}

function linkLines(links: {
  repo: string | null;
  live: string | null;
}): Line[] {
  const lines: Line[] = [];
  if (links.repo)
    lines.push([seg("repo   ", "muted"), link(links.repo, links.repo)]);
  if (links.live)
    lines.push([seg("live   ", "muted"), link(links.live, links.live)]);
  return lines.length ? [blank, ...lines] : [];
}

// ---------------------------------------------------------------- commands

interface Command {
  name: string;
  aliases?: string[];
  usage: string;
  summary: string;
  /** Hidden commands work but are not listed by `help`. */
  hidden?: boolean;
  run(args: string[], ctx: CommandContext): CommandResult;
}

const DIRECTORIES = [
  "projects",
  "research",
  "experience",
  "skills",
  "education",
  "activities",
  "certifications",
] as const;

const BANNER = [
  " ___ _  _ ___ _____   _____ _____ ",
  "/ __| || | _ \\ __\\ \\ / /_ _|_   _|",
  "\\__ \\ __ |   / _| \\ V / | |  | |  ",
  "|___/_||_|_|_\\___| |_| |___| |_|  ",
];

function labLines(key: ExperienceKey, data: TerminalData): Line[] {
  const skills = data.skills.filter((s) => s.experience === key);
  const projects = data.projects.filter((p) => p.experience === key);
  const experience = data.experience.filter((x) => x.experience === key);
  const research = key === "research-explorer" ? data.research : [];
  const introLine: Line =
    key === "sql"
      ? [link("open the SQL playground ↓", "#sql-heading")]
      : key === "ml-lab"
        ? [link("open the ML laboratory ↓", "#ml-heading")]
        : key === "infra"
          ? [link("open the infrastructure simulator ↓", "#infra-heading")]
          : [
              seg(
                "interactive lab in development — here is what it draws on:",
                "muted",
              ),
            ];
  const lines: Line[] = [
    [seg(`[ ${LAB_TITLES[key]} ]`, "accent")],
    introLine,
    blank,
  ];
  if (skills.length) {
    lines.push([
      seg("skills   ", "muted"),
      seg(skills.map((s) => s.name).join(", ")),
    ]);
  }
  const related = [...projects, ...experience, ...research];
  for (const item of related) {
    lines.push([seg("related  ", "muted"), cmd(item.slug, `cat ${item.slug}`)]);
  }
  return lines;
}

function highlight(text: string, term: string): Segment[] {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return [seg(text)];
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + term.length + 40);
  return [
    seg(`${start > 0 ? "…" : ""}${text.slice(start, i)}`),
    seg(text.slice(i, i + term.length), "accent"),
    seg(`${text.slice(i + term.length, end)}${end < text.length ? "…" : ""}`),
  ];
}

function searchable(entry: Entry): string[] {
  switch (entry.kind) {
    case "project":
      return [
        entry.item.title,
        entry.item.summary ?? "",
        ...entry.item.highlights,
        entry.item.stack.join(", "),
      ];
    case "research":
      return [
        entry.item.title,
        ...entry.item.methods,
        ...entry.item.findings,
        entry.item.tools.join(", "),
      ];
    case "experience":
      return [entry.title, ...entry.item.highlights];
    case "activity":
      return [entry.title, ...entry.item.details];
  }
}

export const COMMANDS: Command[] = [
  {
    name: "help",
    usage: "help [command]",
    summary: "list commands, or explain one",
    run(args) {
      if (args[0]) {
        const c = findCommand(args[0]);
        if (!c) return error(`help: no such command '${args[0]}'`);
        return out(
          [seg(c.usage, "accent")],
          [seg(c.summary)],
          ...(c.aliases?.length
            ? [[seg(`aliases: ${c.aliases.join(", ")}`, "muted")]]
            : []),
        );
      }
      return out(
        ...COMMANDS.filter((c) => !c.hidden).map((c): Line => [
          cmd(c.name),
          seg(pad("", 14 - c.name.length)),
          seg(c.summary, "muted"),
        ]),
        blank,
        [
          seg("tab completes, ↑/↓ recall history, ctrl+l clears. ", "muted"),
          seg("click any ", "muted"),
          seg("highlighted", "accent"),
          seg(" word to run it.", "muted"),
        ],
      );
    },
  },
  {
    name: "whoami",
    usage: "whoami",
    summary: "who is this",
    run(_args, { data }) {
      const p = data.profile;
      return out(
        [seg(p.name, "accent")],
        [seg(p.degree)],
        [seg(p.institution, "muted")],
      );
    },
  },
  {
    name: "neofetch",
    aliases: ["fetch"],
    usage: "neofetch",
    summary: "system information, portfolio edition",
    run(_args, { data }) {
      const counts = new Map<string, number>();
      for (const p of data.projects) {
        for (const s of p.stack) counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      const topStack = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([name]) => name);
      const kv = (k: string, v: string): Line => [
        seg(pad(k, 10), "accent"),
        seg(v),
      ];
      return out(
        ...BANNER.map((row): Line => [seg(row, "accent")]),
        blank,
        kv("user", data.profile.name),
        kv("degree", data.profile.degree),
        kv("school", data.profile.institution),
        kv("focus", Object.values(PILLAR_LABELS).join(" · ")),
        kv("projects", String(data.projects.length)),
        kv("fieldwork", String(data.research.length)),
        ...(topStack.length ? [kv("stack", topStack.join(", "))] : []),
      );
    },
  },
  {
    name: "ls",
    aliases: ["dir"],
    usage:
      "ls [projects|research|experience|skills|education|activities|certifications]",
    summary: "list sections, or what is in one",
    run(args, { data }) {
      const dir = args[0]?.replace(/\/$/, "");
      if (!dir) {
        return out(
          DIRECTORIES.flatMap((d): Segment[] => [
            cmd(`${d}/`, `ls ${d}`),
            seg("  "),
          ]),
        );
      }
      const row = (slug: string, title: string, period: string): Line => [
        cmd(slug, `cat ${slug}`),
        seg(pad("", 2)),
        seg(title),
        ...(period ? [seg(`  ${period}`, "muted")] : []),
      ];
      switch (dir) {
        case "projects":
          return out(
            ...data.projects.map((p) =>
              row(p.slug, p.title, formatPeriod(p.period)),
            ),
          );
        case "research":
          return out(
            ...data.research.map((r) =>
              row(r.slug, r.title, formatPeriod(r.period)),
            ),
          );
        case "experience":
          return out(
            ...data.experience.map((x) =>
              row(
                x.slug,
                `${x.role} — ${x.organisation}`,
                formatPeriod(x.period),
              ),
            ),
          );
        case "activities":
          return out(
            ...data.extracurriculars.map((a) =>
              row(
                a.projectSlug ?? a.slug,
                `${a.role} — ${a.organisation}`,
                formatPeriod(a.period),
              ),
            ),
          );
        case "skills":
          return COMMANDS_BY_NAME.get("skills")!.run([], { data, history: [] });
        case "education":
          return out(
            ...data.education.flatMap((e): Line[] => [
              [seg(e.degree, "accent")],
              [seg(`${e.institution}  ${formatPeriod(e.period)}`, "muted")],
              ...e.details.map(bullet),
            ]),
          );
        case "certifications":
          return out(
            ...data.certifications.map((c): Line => [
              seg(c.name),
              seg(`  ${c.issuer}  ${formatPeriod(c.period)}`, "muted"),
            ]),
          );
        default:
          return error(`ls: cannot access '${dir}': No such file or directory`);
      }
    },
  },
  {
    name: "cat",
    aliases: ["show", "less", "more"],
    usage: "cat <name>",
    summary: "show a project, fieldwork study or role in full",
    run(args, { data }) {
      const query = args.join(" ");
      if (!query) return error("usage: cat <name>  (try `ls projects`)");
      const found = resolveEntry(data, query);
      if ("entry" in found) return out(...describe(found.entry, data));
      if ("ambiguous" in found) {
        return out(
          [seg(`cat: '${query}' matches several entries:`, "muted")],
          ...found.ambiguous.map((e): Line => [
            seg("  "),
            cmd(e.slug, `cat ${e.slug}`),
          ]),
        );
      }
      return error(`cat: ${query}: No such file or directory`);
    },
  },
  {
    name: "open",
    usage: "open <name>",
    summary: "show the links for an entry",
    run(args, { data }) {
      const query = args.join(" ");
      if (!query) return error("usage: open <name>");
      const found = resolveEntry(data, query);
      if (!("entry" in found)) {
        return COMMANDS_BY_NAME.get("cat")!.run(args, { data, history: [] });
      }
      const e = found.entry;
      const links =
        e.kind === "project"
          ? e.item.links
          : e.kind === "activity"
            ? { repo: null, live: e.item.links?.live ?? null }
            : { repo: null, live: null };
      const lines = linkLines(links).slice(1);
      return lines.length
        ? out(...lines)
        : out([seg(`${e.slug}: no public links`, "muted")]);
    },
  },
  {
    name: "skills",
    usage: "skills [category]",
    summary: "skills as a tree",
    run(args, { data }) {
      const filter = args.join(" ").toLowerCase();
      const categories = [
        ...new Set(data.skills.map((s) => s.category)),
      ].filter((c) => !filter || c.toLowerCase().includes(filter));
      if (!categories.length)
        return error(`skills: no category matching '${filter}'`);
      const lines: Line[] = [];
      for (const category of categories) {
        lines.push([seg(category, "accent")]);
        const items = data.skills.filter((s) => s.category === category);
        items.forEach((s, i) => {
          const branch = i === items.length - 1 ? "└── " : "├── ";
          lines.push([
            seg(branch, "muted"),
            s.experience && s.experience !== "terminal"
              ? cmd(s.name, labCommandFor(s.experience))
              : seg(s.name),
          ]);
        });
      }
      return out(...lines);
    },
  },
  {
    name: "stack",
    usage: "stack <technology>",
    summary: "which projects use a technology",
    run(args, { data }) {
      const tech = args.join(" ").toLowerCase();
      if (!tech)
        return error("usage: stack <technology>  (e.g. stack fastapi)");
      const projects = data.projects.filter((p) =>
        p.stack.some((s) => s.toLowerCase().includes(tech)),
      );
      const skills = data.skills.filter((s) =>
        s.name.toLowerCase().includes(tech),
      );
      if (!projects.length && !skills.length) {
        return out([seg(`stack: nothing uses '${tech}' (yet)`, "muted")]);
      }
      return out(
        ...skills.map((s): Line => [
          seg("skill    ", "muted"),
          seg(`${s.name}  (${s.category})`),
        ]),
        ...projects.map((p): Line => [
          seg("project  ", "muted"),
          cmd(p.slug, `cat ${p.slug}`),
        ]),
      );
    },
  },
  {
    name: "grep",
    aliases: ["search", "find"],
    usage: "grep <term>",
    summary: "search everything",
    run(args, { data }) {
      const term = args.join(" ");
      if (!term) return error("usage: grep <term>");
      const hits: Line[] = [];
      for (const e of entries(data)) {
        for (const text of searchable(e)) {
          if (text.toLowerCase().includes(term.toLowerCase())) {
            hits.push([
              cmd(e.slug, `cat ${e.slug}`),
              seg(": ", "muted"),
              ...highlight(text, term),
            ]);
            break;
          }
        }
      }
      return hits.length
        ? out(...hits)
        : out([seg(`grep: no matches for '${term}'`, "muted")]);
    },
  },
  {
    name: "experience",
    aliases: ["exp", "work"],
    usage: "experience",
    summary: "work experience in full",
    run(_args, { data }) {
      return out(
        ...entries(data)
          .filter((e) => e.kind === "experience")
          .flatMap((e, i) => [...(i ? [blank] : []), ...describe(e, data)]),
      );
    },
  },
  {
    name: "fieldwork",
    aliases: ["research"],
    usage: "fieldwork",
    summary: "field research studies in full",
    run(_args, { data }) {
      return out(
        ...entries(data)
          .filter((e) => e.kind === "research")
          .flatMap((e, i) => [...(i ? [blank] : []), ...describe(e, data)]),
      );
    },
  },
  {
    name: "sql",
    usage: "sql",
    summary: "the SQL playground",
    run: (_args, { data }) => out(...labLines("sql", data)),
  },
  {
    name: "ml",
    usage: "ml",
    summary: "the ML laboratory",
    run: (_args, { data }) => out(...labLines("ml-lab", data)),
  },
  {
    name: "infra",
    usage: "infra",
    summary: "the infrastructure simulator",
    run: (_args, { data }) => out(...labLines("infra", data)),
  },
  {
    name: "explore",
    usage: "explore",
    summary: "the research & fieldwork explorer",
    run: (_args, { data }) => out(...labLines("research-explorer", data)),
  },
  {
    name: "contact",
    usage: "contact",
    summary: "how to reach me",
    run(_args, { data }) {
      const { github, linkedin, email } = data.profile.links;
      const row = (k: string, v: string | null, href?: string): Line => [
        seg(pad(k, 10), "muted"),
        v
          ? href
            ? link(v, href)
            : seg(v)
          : seg("(not published yet)", "muted"),
      ];
      return out(
        row("github", github, github),
        row("linkedin", linkedin, linkedin ?? undefined),
        row("email", email, email ? `mailto:${email}` : undefined),
      );
    },
  },
  {
    name: "theme",
    usage: "theme [light|dark]",
    summary: "switch colour theme",
    run(args, { getTheme, setTheme }) {
      if (!getTheme || !setTheme) return error("theme: not available here");
      const current = getTheme();
      const wanted = args[0] ?? (current === "light" ? "dark" : "light");
      if (wanted !== "light" && wanted !== "dark") {
        return error("usage: theme [light|dark]");
      }
      setTheme(wanted);
      return out([seg("theme: ", "muted"), seg(wanted, "accent")]);
    },
  },
  {
    name: "history",
    usage: "history",
    summary: "commands you have run",
    run(_args, { history }) {
      return out(
        ...history.map((h, i): Line => [
          seg(String(i + 1).padStart(4) + "  ", "muted"),
          cmd(h),
        ]),
      );
    },
  },
  {
    name: "echo",
    usage: "echo <text>",
    summary: "print text",
    hidden: true,
    run: (args) => out([seg(args.join(" "))]),
  },
  {
    name: "clear",
    aliases: ["cls"],
    usage: "clear",
    summary: "clear the screen",
    run: () => ({ lines: [], clear: true }),
  },
  // Easter eggs.
  {
    name: "sudo",
    usage: "sudo",
    summary: "",
    hidden: true,
    run: () =>
      out([
        seg(
          "visitor is not in the sudoers file. This incident will be reported.",
          "error",
        ),
      ]),
  },
  {
    name: "vim",
    aliases: ["vi", "nvim", "emacs", "nano"],
    usage: "vim",
    summary: "",
    hidden: true,
    run: () =>
      out(
        [
          seg(
            "you can check out any time you like, but you can never leave.",
            "muted",
          ),
        ],
        [seg("(try :q)", "muted")],
      ),
  },
  {
    name: ":q",
    aliases: [":q!", ":wq", "exit", "quit", "logout"],
    usage: ":q",
    summary: "",
    hidden: true,
    run: () =>
      out([seg("nice try — there is no escape. type ", "muted"), cmd("help")]),
  },
  {
    name: "rm",
    usage: "rm",
    summary: "",
    hidden: true,
    run: () => error("rm: permission denied — this portfolio is read-only"),
  },
];

const COMMANDS_BY_NAME = new Map<string, Command>();
for (const c of COMMANDS) {
  COMMANDS_BY_NAME.set(c.name, c);
  for (const a of c.aliases ?? []) COMMANDS_BY_NAME.set(a, c);
}

function findCommand(name: string): Command | undefined {
  return COMMANDS_BY_NAME.get(name.toLowerCase());
}

function labCommandFor(key: ExperienceKey): string {
  return {
    sql: "sql",
    "ml-lab": "ml",
    infra: "infra",
    "research-explorer": "explore",
    terminal: "help",
  }[key];
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = dp[j]!;
      dp[j] = Math.min(
        dp[j]! + 1,
        dp[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

// ---------------------------------------------------------------- public API

export function runCommand(input: string, ctx: CommandContext): CommandResult {
  const [name, ...args] = tokenize(input.trim());
  if (!name) return { lines: [] };
  const command = findCommand(name);
  if (command) return command.run(args, ctx);

  const suggestion = COMMANDS.filter((c) => !c.hidden)
    .map((c) => ({ c, d: distance(name.toLowerCase(), c.name) }))
    .sort((a, b) => a.d - b.d)[0];
  return out([
    seg(`command not found: ${name}. `, "error"),
    ...(suggestion && suggestion.d <= 2
      ? [
          seg("did you mean ", "muted"),
          cmd(suggestion.c.name),
          seg("? ", "muted"),
        ]
      : []),
    seg("try ", "muted"),
    cmd("help"),
  ]);
}

export interface Completion {
  /** The input with the longest unambiguous completion applied. */
  value: string;
  candidates: string[];
}

export function complete(input: string, data: TerminalData): Completion {
  const endsWithSpace = /\s$/.test(input);
  const tokens = tokenize(input);
  const completingName =
    tokens.length === 0 || (tokens.length === 1 && !endsWithSpace);
  const partial = endsWithSpace ? "" : (tokens.at(-1) ?? "");

  let pool: string[];
  if (completingName) {
    pool = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);
  } else {
    const command = findCommand(tokens[0]!)?.name;
    switch (command) {
      case "cat":
      case "open":
        pool = entries(data).map((e) => e.slug);
        break;
      case "ls":
        pool = [...DIRECTORIES];
        break;
      case "skills":
        pool = [...new Set(data.skills.map((s) => s.category))];
        break;
      case "theme":
        pool = ["light", "dark"];
        break;
      case "help":
        pool = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);
        break;
      default:
        pool = [];
    }
  }

  const candidates = pool.filter((p) =>
    p.toLowerCase().startsWith(partial.toLowerCase()),
  );
  if (!candidates.length) return { value: input, candidates: [] };

  let common = candidates[0]!;
  for (const c of candidates) {
    let i = 0;
    while (
      i < common.length &&
      i < c.length &&
      common[i]!.toLowerCase() === c[i]!.toLowerCase()
    )
      i += 1;
    common = common.slice(0, i);
  }
  const head = input.slice(0, input.length - partial.length);
  const done = candidates.length === 1;
  const word = common.length >= partial.length ? common : partial;
  const quoted = /\s/.test(word) ? `"${word}"` : word;
  return {
    value: `${head}${done ? quoted : word}${done ? " " : ""}`,
    candidates: done ? [] : candidates,
  };
}

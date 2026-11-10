import { describe, expect, it, vi } from "vitest";
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
import { COMMANDS, complete, formatPeriod, runCommand } from "./commands";
import { tokenize } from "./parser";
import type { Line, TerminalData } from "./types";

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

const text = (lines: Line[]) =>
  lines.map((l) => l.map((s) => s.text).join("")).join("\n");
const run = (input: string) => runCommand(input, { data, history: [] });
const allLinks = (lines: Line[]) =>
  lines.flatMap((l) => l.filter((s) => s.href).map((s) => s.href!));

describe("tokenize", () => {
  it("splits on whitespace and groups quotes", () => {
    expect(tokenize(`  cat  "foo bar" 'baz qux' x `)).toEqual([
      "cat",
      "foo bar",
      "baz qux",
      "x",
    ]);
    expect(tokenize(`echo ""`)).toEqual(["echo", ""]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("formatPeriod", () => {
  it("formats ranges, single months and open-ended periods", () => {
    expect(formatPeriod({ start: "2026-05", end: null })).toBe(
      "May 2026 – present",
    );
    expect(formatPeriod({ start: "2026-10", end: "2026-10" })).toBe("Oct 2026");
    expect(formatPeriod({ start: "2025-08", end: "2025-09" })).toBe(
      "Aug 2025 – Sep 2025",
    );
    expect(formatPeriod({ start: null, end: null })).toBe("");
  });
});

describe("commands", () => {
  it("help lists every visible command and no hidden ones", () => {
    const out = text(run("help").lines);
    for (const c of COMMANDS.filter((c) => !c.hidden)) {
      expect(out).toContain(c.name);
    }
    expect(out).not.toContain("sudo");
  });

  it("suggests the nearest command for typos", () => {
    const out = run("hlep").lines;
    expect(text(out)).toContain("command not found: hlep");
    expect(out[0]!.some((s) => s.cmd === "help")).toBe(true);
  });

  it("whoami and neofetch come from the profile", () => {
    expect(text(run("whoami").lines)).toContain(profile.name);
    const fetch = text(run("neofetch").lines);
    expect(fetch).toContain(profile.institution);
    expect(fetch).toContain(`projects  ${projects.length}`);
  });

  it("ls lists sections and their entries", () => {
    expect(text(run("ls").lines)).toContain("projects/");
    const out = text(run("ls projects").lines);
    for (const p of projects) expect(out).toContain(p.slug);
    expect(text(run("ls nowhere").lines)).toContain("No such file");
  });

  it("cat prints resume bullets verbatim", () => {
    for (const p of projects) {
      const out = text(run(`cat ${p.slug}`).lines);
      expect(out).toContain(p.title);
      for (const h of p.highlights) expect(out).toContain(h);
    }
    for (const r of research) {
      const out = text(run(`cat ${r.slug}`).lines);
      for (const f of r.findings) expect(out).toContain(f);
    }
  });

  it("cat resolves partial names and reports ambiguity", () => {
    expect(text(run("cat rinn").lines)).toContain("0.89 ROC-AUC");
    const ambiguous = text(run("cat nainital").lines);
    expect(ambiguous).toContain("matches several entries");
    expect(text(run("cat definitely-not-here").lines)).toContain(
      "No such file",
    );
  });

  it("open shows only public links", () => {
    const sankhya = allLinks(run("open sankhya").lines);
    expect(sankhya).toEqual(["https://sankhya-timeline.vercel.app"]);
  });

  it("grep and stack search the content", () => {
    expect(text(run("grep Qdrant").lines)).toContain(
      "ai-engineer-intern-aidatacrafttech",
    );
    expect(text(run("stack fastapi").lines)).toContain(
      "nainital-tourism-vulnerability-dashboard",
    );
  });

  it("never exposes unreviewed or private repositories", () => {
    const everything = [
      "help",
      "ls projects",
      "ls activities",
      "skills",
      "grep a",
      "grep brsr",
      "cat cdp",
      "sql",
      "ml",
      "infra",
      "explore",
      "contact",
      ...projects.map((p) => `open ${p.slug}`),
    ]
      .map((c) => run(c).lines)
      .flat();
    const out = text(everything) + allLinks(everything).join(" ");
    for (const hidden of [
      "brsr_tool",
      "cdp_analysis",
      "DataCo-Market-Dashboard",
      "SDG-Streamlit-Interactive-Dashboard",
      "my-neovim-ds-config",
      "github.com/Shreyit/SANKHYA",
      "sankhya_landing",
    ]) {
      expect(out).not.toContain(hidden);
    }
  });

  it("theme uses the provided accessors", () => {
    const setTheme = vi.fn();
    const result = runCommand("theme", {
      data,
      history: [],
      getTheme: () => "dark",
      setTheme,
    });
    expect(setTheme).toHaveBeenCalledWith("light");
    expect(text(result.lines)).toContain("light");
    expect(text(run("theme").lines)).toContain("not available");
  });

  it("clear clears and history lists previous commands", () => {
    expect(run("clear").clear).toBe(true);
    const out = runCommand("history", { data, history: ["ls", "help"] });
    expect(text(out.lines)).toMatch(/1\s+ls/);
  });
});

describe("complete", () => {
  it("completes command names and arguments", () => {
    expect(complete("wh", data).value).toBe("whoami ");
    expect(complete("ls p", data).value).toBe("ls projects ");
    expect(complete("cat rinn", data).value).toBe("cat rinn-microcredit-risk ");
  });

  it("returns candidates when ambiguous", () => {
    const result = complete("cat nainital", data);
    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.value.startsWith("cat nainital")).toBe(true);
  });
});

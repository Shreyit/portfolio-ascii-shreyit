import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  allProjects,
  allResearch,
  allExperience,
  certifications,
  education,
  experience,
  extracurriculars,
  githubRepos,
  profile,
  projects,
  projectsByPillar,
  research,
  skills,
} from "./index";
import allowlistJson from "./allowlist.json";
import { filterPublic } from "../scripts/sync-github.mjs";

const allowlist = allowlistJson as unknown as string[];
const YEAR_MONTH = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
const HTTPS = /^https:\/\//;

describe("content layer", () => {
  it("parses everything at module load", () => {
    expect(profile.name).toBe("Shreyit Sinha");
    expect(education.length).toBeGreaterThan(0);
    expect(experience.length).toBeGreaterThan(0);
    expect(certifications.length).toBeGreaterThan(0);
    expect(extracurriculars.length).toBeGreaterThan(0);
    expect(allProjects.length).toBeGreaterThan(0);
    expect(projects.length).toBeGreaterThan(0);
    expect(research.length).toBeGreaterThan(0);
    expect(skills.length).toBeGreaterThan(0);
    expect(githubRepos.length).toBeGreaterThan(0);
  });

  it("every project.github is allowlisted and present in github.json", () => {
    const repoNames = new Set(githubRepos.map((repo) => repo.name));
    for (const project of allProjects) {
      if (!project.github) continue;
      expect(allowlist).toContain(project.github);
      expect(repoNames.has(project.github)).toBe(true);
    }
  });

  it("every github.json entry is in the allowlist", () => {
    for (const repo of githubRepos) {
      expect(allowlist).toContain(repo.name);
    }
  });

  it("contains no private contact details or private repo names", () => {
    // Built by concatenation so this test file itself does not contain them.
    const banned = [
      "77598" + "11300",
      "stud.tiss" + ".ac.in",
      "chromolaena-invasion" + "-frontier",
      "nainital_tourism_" + "reearch",
      "nyc-taxi" + "-ml",
      "sankhya" + "_landing",
      "github.com/Shreyit/" + "SANKHYA-Timeline",
      "statistical_modelling_" + "std",
    ];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else {
          files.push(path);
        }
      }
    };
    walk(join(__dirname));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const needle of banned) {
        expect(text, `${file} must not contain ${needle}`).not.toContain(
          needle,
        );
      }
    }
  });

  it("every URL in content is https", () => {
    const urls: string[] = [];
    const collect = (value: unknown) => {
      if (typeof value === "string") {
        if (value.startsWith("http://") || value.startsWith("https://")) {
          urls.push(value);
        }
        return;
      }
      if (value && typeof value === "object") {
        for (const child of Object.values(value)) collect(child);
      }
    };
    collect({
      profile,
      education,
      experience,
      certifications,
      extracurriculars,
      allProjects,
      allResearch,
      allExperience,
      skills,
      githubRepos,
    });
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(HTTPS);
    }
  });

  it("slugs are unique across projects, research, experience and extracurriculars", () => {
    const slugs = [
      ...allProjects.map((p) => p.slug),
      ...allResearch.map((r) => r.slug),
      ...allExperience.map((e) => e.slug),
      ...extracurriculars.map((e) => e.slug),
    ];
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("periods are valid YYYY-MM when set", () => {
    const periods: Array<{ start: string | null; end: string | null }> = [
      ...education.map((e) => e.period),
      ...experience.map((e) => e.period),
      ...certifications.map((e) => e.period),
      ...extracurriculars.map((e) => e.period),
      ...allProjects.map((e) => e.period),
      ...allResearch.map((e) => e.period),
    ];
    for (const period of periods) {
      if (period.start !== null) expect(period.start).toMatch(YEAR_MONTH);
      if (period.end !== null) expect(period.end).toMatch(YEAR_MONTH);
    }
  });

  it("has at least two research entries", () => {
    expect(allResearch.length).toBeGreaterThanOrEqual(2);
    expect(research.length).toBeGreaterThanOrEqual(2);
  });

  it("public helpers exclude needsReview entries", () => {
    expect(projects.every((entry) => !entry.needsReview)).toBe(true);
    expect(research.every((entry) => !entry.needsReview)).toBe(true);
    expect(experience.every((entry) => !entry.needsReview)).toBe(true);

    for (const entry of allProjects.filter((entry) => entry.needsReview)) {
      expect(projects).not.toContain(entry);
    }
    for (const pillar of [
      "engineering",
      "ai",
      "data-science",
      "research",
      "sustainability",
    ] as const) {
      expect(
        projectsByPillar(pillar).every((entry) => !entry.needsReview),
      ).toBe(true);
    }
  });

  it("covers key pillars in projects and research", () => {
    const projectPillars = new Set(allProjects.flatMap((p) => p.pillar));
    for (const pillar of [
      "engineering",
      "ai",
      "data-science",
      "sustainability",
    ] as const) {
      expect(projectPillars.has(pillar)).toBe(true);
    }
    const researchPillars = new Set(research.flatMap((r) => r.pillar));
    expect(researchPillars.has("research")).toBe(true);
  });
});

describe("sync-github filterPublic guard", () => {
  const publicRepo = {
    name: "ok-repo",
    private: false,
    archived: false,
  };

  it("allows public, non-archived repos", () => {
    const { allowed, rejected } = filterPublic([publicRepo]);
    expect(allowed).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("rejects private repos", () => {
    const { allowed, rejected } = filterPublic([
      { ...publicRepo, private: true },
    ]);
    expect(allowed).toHaveLength(0);
    expect(rejected[0]?.reason).toBe("private");
  });

  it("rejects archived repos", () => {
    const { allowed, rejected } = filterPublic([
      { ...publicRepo, archived: true },
    ]);
    expect(allowed).toHaveLength(0);
    expect(rejected[0]?.reason).toBe("archived");
  });

  it("rejects missing repos", () => {
    const { allowed, rejected } = filterPublic([null]);
    expect(allowed).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });
});

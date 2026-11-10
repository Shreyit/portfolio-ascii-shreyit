// Server-only module: parsed and frozen at module load. Do not import from
// client components — the data layer is intended for server rendering for now.
import "server-only";
import {
  certificationSchema,
  educationSchema,
  experienceSchema,
  extracurricularSchema,
  githubRepoSchema,
  profileSchema,
  projectSchema,
  researchEntrySchema,
  skillSchema,
  type Certification,
  type Education,
  type Experience,
  type Extracurricular,
  type Project,
  type ResearchEntry,
  type Skill,
  type Profile,
  type GithubRepo,
  type Pillar,
} from "./schema";
import {
  profile as profileData,
  education as educationData,
  experience as experienceData,
  certifications as certificationsData,
  extracurriculars as extracurricularsData,
} from "./resume";
import { projects as projectsData } from "./projects";
import { research as researchData } from "./research";
import { skills as skillsData } from "./skills";
import githubJson from "./generated/github.json";
import allowlistJson from "./allowlist.json";

const allowlist = allowlistJson as unknown as string[];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

// Parse everything up front — a content error throws at build time, never at request time.
export const profile: Profile = deepFreeze(profileSchema.parse(profileData));
export const education: Education[] = deepFreeze(
  educationData.map((entry) => educationSchema.parse(entry)),
);
export const allExperience: Experience[] = deepFreeze(
  experienceData.map((entry) => experienceSchema.parse(entry)),
);
export const experience: Experience[] = deepFreeze(
  allExperience.filter((entry) => !entry.needsReview),
);
export const certifications: Certification[] = deepFreeze(
  certificationsData.map((entry) => certificationSchema.parse(entry)),
);
export const extracurriculars: Extracurricular[] = deepFreeze(
  extracurricularsData.map((entry) => extracurricularSchema.parse(entry)),
);
export const allResearch: ResearchEntry[] = deepFreeze(
  researchData.map((entry) => researchEntrySchema.parse(entry)),
);
export const research: ResearchEntry[] = deepFreeze(
  allResearch.filter((entry) => !entry.needsReview),
);
export const skills: Skill[] = deepFreeze(
  skillsData.map((entry) => skillSchema.parse(entry)),
);

export const githubRepos: GithubRepo[] = deepFreeze(
  githubRepoSchema.array().parse(githubJson),
);

const reposByName = new Map(githubRepos.map((repo) => [repo.name, repo]));

const EXCLUDED_STACK_LANGUAGES = new Set(
  [
    "Dockerfile",
    "Makefile",
    "AppleScript",
    "Batchfile",
    "Procfile",
    "Shell",
    "PowerShell",
  ].map((name) => name.toLowerCase()),
);

const STACK_LANGUAGE_THRESHOLD = 0.1;

// GitHub languages backfill: significant languages only. Keeps entries with at
// least 10% of the repo's bytes, drops build/config "languages", largest first.
export function stackFromLanguages(
  languages: Record<string, number>,
): string[] {
  const entries = Object.entries(languages).filter(([, bytes]) => bytes > 0);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total <= 0) {
    return [];
  }
  return entries
    .filter(([, bytes]) => bytes / total >= STACK_LANGUAGE_THRESHOLD)
    .filter(([name]) => !EXCLUDED_STACK_LANGUAGES.has(name.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

// Merge public GitHub metadata into projects, keyed by `github` (repo name).
// Repos are validated against the allowlist here too — anything else is dropped loudly.
export const allProjects: Project[] = deepFreeze(
  projectsData.map((project) => {
    const parsed = projectSchema.parse(project);
    if (!parsed.github) {
      return parsed;
    }
    if (!allowlist.includes(parsed.github)) {
      throw new Error(
        `Project "${parsed.slug}" references repo "${parsed.github}", which is not in content/allowlist.json`,
      );
    }
    const repo = reposByName.get(parsed.github);
    return {
      ...parsed,
      stack:
        parsed.stack.length > 0
          ? parsed.stack
          : stackFromLanguages(repo?.languages ?? {}),
      links: {
        repo: parsed.links.repo ?? repo?.url ?? null,
        live: parsed.links.live ?? repo?.homepage ?? null,
      },
    };
  }),
);

// Public surface: anything still flagged needsReview is hidden from pages.
// Full arrays stay exported (allProjects / allResearch / allExperience) for tests and tooling.
export const projects: Project[] = deepFreeze(
  allProjects.filter((entry) => !entry.needsReview),
);

export const PILLARS = [
  "engineering",
  "ai",
  "data-science",
  "research",
  "sustainability",
] as const satisfies readonly Pillar[];

export function projectsByPillar(pillar: Pillar): Project[] {
  return projects.filter((project) => project.pillar.includes(pillar));
}

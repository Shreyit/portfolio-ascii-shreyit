import { z } from "zod";

const yearMonth = z
  .string()
  .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");

const httpsUrl = z
  .string()
  .url()
  .refine((url) => url.startsWith("https://"), "URLs must be https");

const periodSchema = z.object({
  start: yearMonth.nullable(),
  end: yearMonth.nullable(),
});

export const Pillar = z.enum([
  "engineering",
  "ai",
  "data-science",
  "research",
  "sustainability",
]);
export type Pillar = z.infer<typeof Pillar>;

export const ExperienceKey = z.enum([
  "terminal",
  "sql",
  "ml-lab",
  "infra",
  "research-explorer",
]);
export type ExperienceKey = z.infer<typeof ExperienceKey>;

export const profileSchema = z.object({
  name: z.string().min(1),
  degree: z.string().min(1),
  institution: z.string().min(1),
  location: z.string().nullable(),
  headline: z.string().nullable(),
  links: z.object({
    github: httpsUrl,
    linkedin: httpsUrl.nullable(),
    email: z.string().email().nullable(),
  }),
  needsReview: z.boolean(),
});
export type Profile = z.infer<typeof profileSchema>;

export const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  period: periodSchema,
  details: z.array(z.string()),
});
export type Education = z.infer<typeof educationSchema>;

export const experienceSchema = z.object({
  slug: z.string().min(1),
  role: z.string().min(1),
  organisation: z.string().min(1),
  location: z.string().nullable(),
  period: periodSchema,
  highlights: z.array(z.string()),
  experience: ExperienceKey.optional(),
  needsReview: z.boolean(),
});
export type Experience = z.infer<typeof experienceSchema>;

export const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  period: periodSchema,
});
export type Certification = z.infer<typeof certificationSchema>;

export const extracurricularSchema = z.object({
  slug: z.string().min(1),
  role: z.string().min(1),
  organisation: z.string().min(1),
  period: periodSchema,
  // When set, this entry refers to a project by slug instead of duplicating it.
  projectSlug: z.string().nullable(),
  details: z.array(z.string()),
  // Optional links. Live URLs only — repositories are not allowed here.
  links: z
    .object({
      live: httpsUrl.optional(),
    })
    .optional(),
});
export type Extracurricular = z.infer<typeof extracurricularSchema>;

export const projectSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  period: periodSchema,
  pillar: z.array(Pillar).min(1),
  summary: z.string().nullable(),
  highlights: z.array(z.string()),
  stack: z.array(z.string()),
  links: z.object({
    repo: httpsUrl.nullable(),
    live: httpsUrl.nullable(),
  }),
  github: z.string().nullable(),
  featured: z.boolean(),
  domain: z.string().nullable().default(null),
  experience: ExperienceKey.optional(),
  needsReview: z.boolean(),
  source: z.enum(["resume", "github", "resume+github"]),
});
export type Project = z.infer<typeof projectSchema>;
export type ProjectInput = z.input<typeof projectSchema>;

export const researchEntrySchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  partner: z.string().min(1),
  location: z.string().min(1),
  period: periodSchema,
  methods: z.array(z.string()),
  sample: z.array(
    z.object({
      label: z.string().min(1),
      n: z.number().int().nonnegative(),
    }),
  ),
  findings: z.array(z.string()),
  tools: z.array(z.string()),
  pillar: z.array(Pillar).min(1),
  needsReview: z.boolean(),
});
export type ResearchEntry = z.infer<typeof researchEntrySchema>;

export const skillSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    "Languages",
    "AI & LLMs",
    "Backend & Web",
    "Databases & Cloud",
    "Data Science & Visualisation",
    "Tools & Research",
  ]),
  experience: ExperienceKey.optional(),
});
export type Skill = z.infer<typeof skillSchema>;

export const githubRepoSchema = z.object({
  name: z.string().min(1),
  url: httpsUrl,
  description: z.string().nullable(),
  homepage: httpsUrl.nullable(),
  languages: z.record(z.string(), z.number().nonnegative()),
  topics: z.array(z.string()),
  stars: z.number().int().nonnegative(),
  pushedAt: z.string(),
});
export type GithubRepo = z.infer<typeof githubRepoSchema>;

import type {
  Profile,
  Education,
  Experience,
  Certification,
  Extracurricular,
} from "./schema";

// Typos fixed while transcribing the resume (verbatim otherwise):
//   "footffall" -> "footfall"        (Sankhya extraction bullet)
//   "Ran EDA Identified ..." -> "Ran EDA; identified ..." (missing punctuation)
//   "CO2 /GHG" -> "CO2/GHG"          (stray space in Egypt CO2 bullet)
export const profile: Profile = {
  name: "Shreyit Sinha",
  degree: "Bachelor of Science (BS) in Analytics and Sustainability Studies",
  institution: "Tata Institute of Social Sciences, Mumbai",
  // Not stated on the resume — do not guess.
  location: null,
  // Deliberately blank: no headline is written anywhere yet.
  headline: null,
  links: {
    github: "https://github.com/Shreyit",
    // Contact details are a later user decision; intentionally unset.
    linkedin: null,
    email: null,
  },
  needsReview: true,
};

export const education: Education[] = [
  {
    institution: "School of Analytics (Formerly LMRF)",
    degree: "Bachelor of Science (BS) in Analytics and Sustainability Studies",
    period: { start: "2024-10", end: null },
    details: ["CGPA: 8.1 (Till SEM IV)"],
  },
];

export const experience: Experience[] = [
  {
    slug: "ai-engineer-intern-aidatacrafttech",
    role: "AI Engineer Intern",
    organisation: "AI DataCraftTech",
    location: "Gurugram, Haryana",
    period: { start: "2026-05", end: null },
    highlights: [
      "Built an AI video-generation pipeline using OpenAI, grounded in NCERT content (class 6–12) via RAG.",
      "Built a real-time multilingual AI voice tutor using Deepgram, OpenAI and Sarvam AI over WebSocket.",
      "Designed citation-grounded RAG retrieval with BGE-M3 embeddings and Qdrant, served via FastAPI.",
      "Scaled the backend on AWS (EC2 Auto Scaling, ALB, S3/CloudFront) with zero-downtime releases.",
    ],
    experience: "infra",
    needsReview: false,
  },
];

export const certifications: Certification[] = [
  {
    name: "MATLAB Onramp",
    issuer: "MathWorks Training Services",
    period: { start: "2025-10", end: "2025-10" },
  },
  {
    name: "On-Premise Sales Job Simulation",
    issuer: "Red Bull × Forage",
    period: { start: "2024-10", end: "2024-10" },
  },
];

export const extracurriculars: Extracurricular[] = [
  {
    slug: "global-colloquium-tiss",
    role: "Volunteer & Organising Team Member",
    organisation: "Global Colloquium, TISS Mumbai",
    period: { start: "2026-05", end: "2026-05" },
    projectSlug: null,
    details: [
      "Contributed and supported the planning, coordination, and smooth execution of activities across teams in backstage logistics.",
    ],
  },
  {
    // BLITZ lives in content/projects.ts (slug "blitz-4-0"); referenced here, not duplicated.
    slug: "blitz-4-0-ref",
    role: "Digital Media & Marketing Head",
    organisation: "Bachelor’s BLITZ 4.0 – Sports Fest",
    period: { start: "2026-10", end: "2026-10" },
    projectSlug: "blitz-4-0",
    details: [],
  },
  {
    slug: "sankhya-sustainable-cultural-fest",
    role: "PR & Marketing",
    organisation: "Sankhya – Sustainable Cultural Fest",
    period: { start: "2026-03", end: "2026-03" },
    projectSlug: null,
    details: [
      "Tracked carbon credits, led digital marketing and design, and built the official landing portal driving a 34% increase in student footfall vs. the prior year.",
    ],
    links: { live: "https://sankhya-timeline.vercel.app" },
  },
  {
    slug: "acumen-business-consulting-club",
    role: "Member",
    organisation: "Acumen - Business & Consulting Club, TISS Mumbai",
    period: { start: "2024-12", end: null },
    projectSlug: null,
    details: [],
  },
];

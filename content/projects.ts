import type { ProjectInput } from "./schema";

// Repo URLs / homepages / descriptions marked below as "from github.json" are
// Note: "Git" appears on the resume only as the hyperlink label to each repo,
// not as a technology — it is intentionally absent from every stack array.
// merged in content/index.ts — they come from the public GitHub API via
// `pnpm sync:github`, not invented here. Repos NOT on the resume were created
// from public GitHub metadata only; their periods/stacks are unknown (null /
// empty) and they are all needsReview.
export const projects: ProjectInput[] = [
  {
    slug: "rinn-microcredit-risk",
    title: "Rinn: Microcredit Default Risk Modelling",
    period: { start: "2026-10", end: "2026-10" },
    pillar: ["data-science", "ai"],
    summary: null,
    highlights: [
      "Built a leakage-free credit-risk pipeline on 900 simulated microloans with train-only preprocessing.",
      "Benchmarked 5 classifiers; logistic regression led at 0.89 ROC-AUC vs. a 0-recall majority baseline.",
      "Tuned the decision threshold to lift default recall from 0.50 to 0.69, matching the lender’s cost of missed defaults.",
      "Found that loan-to-income drives risk, with default rising from 3.2% to 37.6% across quartiles.",
    ],
    stack: ["Python", "scikit-learn", "pandas"],
    links: { repo: null, live: null }, // repo URL merged from github.json at load
    github: "rinn-microcredit-risk",
    featured: true,
    experience: "ml-lab",
    needsReview: false,
    source: "resume+github",
  },
  {
    slug: "nainital-tourism-vulnerability-dashboard",
    title: "Nainital Tourism Vulnerability Dashboard",
    period: { start: "2026-08", end: "2026-08" },
    pillar: ["sustainability", "data-science"],
    summary: null,
    highlights: [
      "Built a dashboard scoring tourism vulnerability across 9 zones from 1,029 survey responses.",
      "Designed a 6-pillar composite index (OECD/JRC method) across 4 stakeholder groups, validated via Monte Carlo weight sensitivity.",
      "Applied K-means to group zones into vulnerability archetypes and trained a classifier at 71% accuracy (vs. 57% baseline).",
      "Developed a RAG chatbot (TF-IDF + LLM) for querying the dashboard, with 42 automated tests and CI.",
    ],
    stack: ["React", "TypeScript", "FastAPI", "scikit-learn"],
    // live homepage merged from github.json (resume shows a "Live" marker)
    links: { repo: null, live: null },
    github: "dashboard_vulnarbility_tourism",
    featured: true,
    needsReview: false,
    source: "resume+github",
  },
  {
    slug: "egypt-co2-dashboard",
    title: "Egypt CO2 Emissions & Climate Justice Dashboard",
    period: { start: "2026-04", end: "2026-04" },
    pillar: ["sustainability", "data-science"],
    summary:
      "A full-stack data visualization dashboard for CO₂ emissions analysis of Egypt, built with Flask, Plotly.js, and Pandas. Features real-time AI context, animated timelines, and data from the World Bank & UNDP. 🌱",
    highlights: [
      "Built a dashboard tracking Egypt’s CO2/GHG trajectory (2001–2023) via live OWID, World Bank and UNDP APIs.",
      "Added per-capita, carbon-intensity and HDI-adjusted metrics for a climate-justice view.",
      "Ran CAGR analysis across 4 phases (-1.5%/yr decline, 2016–2019) with LLM-generated insights via OpenRouter.",
    ],
    stack: ["Python", "Flask", "HTML/CSS"],
    // live homepage merged from github.json (resume shows a "Live" marker)
    links: { repo: null, live: null },
    github: "emission-analysis-dashboard",
    featured: false,
    needsReview: false,
    source: "resume+github",
  },
  {
    slug: "blitz-4-0",
    title: "BLITZ 4.0 – Sports Fest Platform",
    period: { start: "2026-10", end: "2026-10" },
    pillar: ["engineering"],
    summary:
      "Interactive website for Bachelor’s BLITZ at TISS Mumbai, featuring sports rules, player and volunteer registration, team rosters, and a live auction dashboard.",
    highlights: [
      "Built a Next.js + Supabase fest platform for 8 sports and 8 teams on a PostgreSQL schema with row-level security",
      "Engineered a live auction engine in PL/pgSQL using row locks, optimistic versioning, idempotent bids and Realtime sync",
      "Added a transactional email outbox, a full audit log and a token-secured live Google Sheet export for organisers",
    ],
    stack: ["Next.js", "Supabase", "PostgreSQL", "PL/pgSQL"],
    // live homepage merged from github.json (resume shows a "Live Portal" marker)
    links: { repo: null, live: null },
    github: "blitz_landing",
    featured: true,
    experience: "sql",
    needsReview: false,
    source: "resume+github",
  },
  // --- GitHub-only entries (not on the resume; public metadata only) ---
  {
    slug: "peoples_analytics_safewaterlines",
    title: "Safewater Lines — People Analytics",
    period: { start: null, end: null },
    pillar: ["data-science"],
    summary:
      "An analysis of the Your Voice employee survey, connecting employee experience to practical organisational improvements.",
    highlights: [],
    stack: [], // merged from GitHub languages at load
    links: { repo: null, live: null },
    github: "peoples_analytics_safewaterlines",
    featured: false,
    domain: "People Analytics",
    needsReview: false,
    source: "github",
  },
  {
    slug: "cdp_analysis",
    title: "cdp_analysis",
    period: { start: null, end: null },
    pillar: ["data-science"],
    summary: null, // GitHub description is empty
    highlights: [],
    stack: [],
    links: { repo: null, live: null },
    github: "cdp_analysis",
    featured: false,
    needsReview: true,
    source: "github",
  },
  {
    slug: "brsr_tool",
    title: "brsr_tool",
    period: { start: null, end: null },
    pillar: ["sustainability"],
    summary: null, // GitHub description is empty
    highlights: [],
    stack: [],
    links: { repo: null, live: null },
    github: "brsr_tool",
    featured: false,
    needsReview: true,
    source: "github",
  },
  {
    slug: "sdg-streamlit-interactive-dashboard",
    title: "SDG-Streamlit-Interactive-Dashboard",
    period: { start: null, end: null },
    pillar: ["sustainability"],
    summary:
      "An interactive SDG dashboard created using streamlit (an open-source Python library) and compare India with South Asian and South East Asian Countries , for SDG 2, 3 and 6",
    highlights: [],
    stack: [],
    links: { repo: null, live: null },
    github: "SDG-Streamlit-Interactive-Dashboard",
    featured: false,
    needsReview: true,
    source: "github",
  },
  {
    slug: "dataco-market-dashboard",
    title: "DataCo-Market-Dashboard",
    period: { start: null, end: null },
    pillar: ["data-science"],
    summary:
      "An interactive Power BI dashboard analyzing global supply chain logistics and profitability for DataCo Operations.",
    highlights: [],
    stack: [],
    links: { repo: null, live: null },
    github: "DataCo-Market-Dashboard",
    featured: false,
    needsReview: true,
    source: "github",
  },
  {
    slug: "my-neovim-ds-config",
    title: "my-neovim-ds-config",
    period: { start: null, end: null },
    pillar: ["engineering"],
    summary: "Neovim configuration optimized for data science and analytics",
    highlights: [],
    stack: [],
    links: { repo: null, live: null },
    github: "my-neovim-ds-config",
    featured: false,
    needsReview: true,
    source: "github",
  },
];

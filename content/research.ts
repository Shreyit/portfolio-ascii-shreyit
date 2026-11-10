import type { ResearchEntry } from "./schema";

// Line 30 of the resume PDF merges two sentences without punctuation; the
// correction "Ran EDA; identified ..." is applied to the Sangamner entry.
export const research: ResearchEntry[] = [
  {
    slug: "nainital-urban-fieldwork",
    title: "Urban Fieldwork — Nainital, Uttarakhand",
    partner: "LMRF × Aarohi Foundation",
    location: "Nainital, Uttarakhand",
    period: { start: "2026-06", end: "2026-07" },
    methods: [
      "Primary surveys across 5 thematic groups",
      "KoboToolbox with geo-tagged data capture",
      "Resident Irritation Index (RII)",
      "Doxey’s Irridex classification",
    ],
    sample: [
      { label: "residents surveyed", n: 231 },
      { label: "tourist feedback responses", n: 196 },
    ],
    findings: [
      "Conducted primary surveys across 5 thematic groups using KoboToolbox with geo-tagged data capture.",
      "Built a Resident Irritation Index (RII) from a 231-resident survey to study tourism carrying capacity.",
      "Classified Nainital at Doxey’s Irridex Apathy stage (RII: 1.46), triangulated with tourist feedback (n=196).",
    ],
    tools: ["KoboToolbox"],
    pillar: ["research", "sustainability"],
    needsReview: false,
  },
  {
    slug: "sangamner-rural-fieldwork",
    title: "Rural Fieldwork — Sangamner, Maharashtra",
    partner: "LMRF × WOTR Organisation",
    location: "Sangamner, Maharashtra",
    period: { start: "2025-08", end: "2025-09" },
    methods: [
      "NSSO HCES survey data collection",
      "Exploratory data analysis",
      "Data structuring into analysis-ready datasets",
    ],
    sample: [
      { label: "households surveyed", n: 116 },
      { label: "villages covered", n: 9 },
    ],
    findings: [
      "Collected NSSO HCES survey data from 116 households across 9 villages.",
      "Structured raw data into analysis-ready datasets using SPSS, R and Python.",
      "Ran EDA; identified significant awareness gaps around Ayushman Bharat benefits and hospital utilization, with only 17.4% of cardholders reporting awareness of scheme benefits and 4.3% reporting use of PM-JAY benefits at a hospital.",
    ],
    tools: ["SPSS", "R", "Python"],
    pillar: ["research"],
    needsReview: false,
  },
];

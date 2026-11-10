// Aggregated, already-published results used by the Research & Fieldwork
// Explorer. Sources are noted per block. No row-level survey data is copied:
// only group means and counts that the public repositories report.

/** Nainital Tourism Vulnerability Dashboard (team project). */
export const NAINITAL_DASHBOARD = {
  // Report.md, contribution table, in the public repo
  // github.com/Shreyit/dashboard_vulnarbility_tourism.
  team: 4,
  role: "analysis, indicators and the dashboard",
  // Resume.
  responses: 1029,
  zones: 9,
  pillars: [
    "water stress",
    "waste & sanitation pressure",
    "infrastructure adequacy",
    "economic dependency & precarity",
    "socio-cultural pressure",
    "visitor experience",
  ], // Report.md, pillar table
  // Final_Pillar_Report.xlsx, sheet "Pillar Aggregate Scores": mean indicator
  // score (0–1) per stakeholder group and Triple Bottom Line pillar, with the
  // number of respondents. `null` = not measured (no survey question asked
  // workers about environmental conditions; the report leaves it blank).
  tripleBottomLine: {
    groups: ["Residents", "Enterprises", "Tourists", "Workers"],
    pillars: ["Economic", "Environmental", "Social"],
    cells: [
      { group: "Residents", pillar: "Economic", mean: 0.571, n: 239 },
      { group: "Residents", pillar: "Environmental", mean: 0.392, n: 239 },
      { group: "Residents", pillar: "Social", mean: 0.613, n: 227 },
      { group: "Enterprises", pillar: "Economic", mean: 0.562, n: 154 },
      { group: "Enterprises", pillar: "Environmental", mean: 0.255, n: 119 },
      { group: "Enterprises", pillar: "Social", mean: 0.333, n: 90 },
      { group: "Tourists", pillar: "Economic", mean: 0.366, n: 315 },
      { group: "Tourists", pillar: "Environmental", mean: 0.622, n: 311 },
      { group: "Tourists", pillar: "Social", mean: 0.331, n: 310 },
      { group: "Workers", pillar: "Economic", mean: 0.371, n: 285 },
      { group: "Workers", pillar: "Environmental", mean: null, n: null },
      { group: "Workers", pillar: "Social", mean: 0.228, n: 294 },
    ],
  },
} as const;

/**
 * Doxey's Irridex (Doxey, 1975), with the stage names used in the Nainital
 * report. The descriptions summarise the model itself, not study findings.
 */
export const IRRIDEX = [
  {
    stage: "Euphoria",
    gist: "visitors are welcomed; little planning or control",
  },
  {
    stage: "Apathy",
    gist: "visitors are taken for granted; contact becomes formal and commercial",
  },
  {
    stage: "Irritation",
    gist: "saturation approaches; residents voice misgivings about tourism",
  },
  {
    stage: "Antagonism",
    gist: "irritation is expressed openly; visitors are blamed for problems",
  },
] as const;

/** From the resume (Urban Fieldwork, Nainital). */
export const NAINITAL_FIELDWORK = {
  rii: 1.46,
  stage: "Apathy",
  residents: 231,
  tourists: 196,
  thematicGroups: 5,
} as const;

/** From the resume (Rural Fieldwork, Sangamner), as % of cardholders. */
export const SANGAMNER = {
  households: 116,
  villages: 9,
  awarePct: 17.4,
  usedPct: 4.3,
} as const;

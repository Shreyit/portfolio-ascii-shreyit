import { describe, expect, it } from "vitest";
import { research } from "@/content";
import {
  IRRIDEX,
  NAINITAL_DASHBOARD,
  NAINITAL_FIELDWORK,
  SANGAMNER,
} from "@/content/research-lab";
import { waffle } from "./ResearchView";

describe("waffle", () => {
  it("fills whole cells and marks a partial one", () => {
    const rows = waffle(17.4);
    expect(rows).toHaveLength(10);
    const cells = rows.join(" ").split(" ");
    expect(cells.filter((c) => c === "#")).toHaveLength(17);
    expect(cells.filter((c) => c === "+")).toHaveLength(1);
    expect(cells.filter((c) => c === ".")).toHaveLength(82);
    expect(waffle(4).join("").includes("+")).toBe(false);
  });
});

describe("research data", () => {
  it("agrees with the resume-derived content", () => {
    const nainital = research.find(
      (r) => r.slug === "nainital-urban-fieldwork",
    )!;
    const text = nainital.findings.join(" ");
    expect(text).toContain(`RII: ${NAINITAL_FIELDWORK.rii}`);
    expect(text).toContain(`${NAINITAL_FIELDWORK.stage} stage`);
    expect(nainital.sample.map((s) => s.n)).toEqual([
      NAINITAL_FIELDWORK.residents,
      NAINITAL_FIELDWORK.tourists,
    ]);
    const sangamner = research.find(
      (r) => r.slug === "sangamner-rural-fieldwork",
    )!;
    const findings = sangamner.findings.join(" ");
    expect(findings).toContain(`${SANGAMNER.awarePct}%`);
    expect(findings).toContain(`${SANGAMNER.usedPct}%`);
    expect(findings).toContain(`${SANGAMNER.households} households`);
  });

  it("covers every stakeholder x pillar cell exactly once", () => {
    const { groups, pillars, cells } = NAINITAL_DASHBOARD.tripleBottomLine;
    expect(cells).toHaveLength(groups.length * pillars.length);
    for (const g of groups) {
      for (const p of pillars) {
        expect(
          cells.filter((c) => c.group === g && c.pillar === p),
        ).toHaveLength(1);
      }
    }
    for (const c of cells) {
      if (c.mean !== null) {
        expect(c.mean).toBeGreaterThanOrEqual(0);
        expect(c.mean).toBeLessThanOrEqual(1);
        expect(c.n).toBeGreaterThan(0);
      }
    }
    // The one unmeasured cell stays missing — never a fabricated zero.
    const missing = cells.filter((c) => c.mean === null);
    expect(missing).toEqual([
      { group: "Workers", pillar: "Environmental", mean: null, n: null },
    ]);
  });

  it("places Nainital on a real Irridex stage", () => {
    expect(IRRIDEX.map((s) => s.stage)).toContain(NAINITAL_FIELDWORK.stage);
  });
});

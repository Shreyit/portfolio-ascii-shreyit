import { describe, expect, it } from "vitest";
import { RINN } from "@/content/rinn-lab";
import { sweepChart } from "./render";

describe("Rinn study data (transcribed)", () => {
  // The notebook's metrics must agree with its own confusion matrices; a
  // typo in either would show up here.
  it("every model's metrics are consistent with its confusion matrix", () => {
    for (const m of RINN.models) {
      const { tn, fp, fn, tp } = m.confusion;
      expect(tn + fp + fn + tp, m.key).toBe(RINN.dataset.test);
      expect(tp + fn, m.key).toBe(RINN.dataset.testDefaults);
      expect((tp + tn) / RINN.dataset.test).toBeCloseTo(m.accuracy, 3);
      expect(tp + fp ? tp / (tp + fp) : 0).toBeCloseTo(m.precision, 3);
      expect(tp / (tp + fn)).toBeCloseTo(m.recall, 3);
      expect(tn / (tn + fp)).toBeCloseTo(m.specificity, 3);
    }
  });

  it("threshold results are consistent and match the resume's claim", () => {
    for (const t of RINN.thresholds) {
      const { tn, fp, fn, tp } = t.confusion;
      expect(tn + fp + fn + tp).toBe(RINN.dataset.test);
      expect(tp / (tp + fp)).toBeCloseTo(t.precision, 3);
      expect(tp / (tp + fn)).toBeCloseTo(t.recall, 3);
    }
    // Resume: "lift default recall from 0.50 to 0.69".
    expect(RINN.thresholds.map((t) => t.recall.toFixed(2))).toEqual([
      "0.50",
      "0.69",
    ]);
    // Resume: "logistic regression led at 0.89 ROC-AUC".
    const logistic = RINN.models.find((m) => m.key === "logistic")!;
    expect(logistic.rocAuc.toFixed(2)).toBe("0.89");
  });
});

describe("sweepChart", () => {
  it("plots both series, marks the selection and labels the x axis", () => {
    const lines = sweepChart(
      [
        { x: 1, fit: 1, val: 0 },
        { x: 2, fit: 0.5, val: 0.5 },
      ],
      1,
      5,
      4,
    );
    expect(lines).toHaveLength(7);
    expect(lines[0]).toContain("*"); // fit = 1 at the top
    expect(lines[4]).toContain("o"); // val = 0 at the bottom
    expect(lines.join("\n")).toContain("@"); // equal fit/val overlap
    expect(
      lines.slice(0, 5).every((l) => l.includes(":") || l.includes("@")),
    ).toBe(true);
    expect(lines.at(-1)).toMatch(/1\s+2$/);
  });
});

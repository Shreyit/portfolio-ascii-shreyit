import { describe, expect, it } from "vitest";
import { COLS, ROWS, infraText } from "./scene";
import { createSim, deploy, killInstance, step } from "./sim";

describe("infra scene", () => {
  it("draws a full grid with the architecture", () => {
    const s = createSim(120);
    const text = infraText(s);
    const lines = text.split("\n");
    expect(lines).toHaveLength(ROWS);
    expect(lines.every((l) => l.length === COLS)).toBe(true);
    for (const label of ["CloudFront", "users", "ALB", "i-01 v1", "i-02 v1"]) {
      expect(text).toContain(label);
    }
    if (process.env.PRINT_SCENE) console.log(text);
  });

  it("shows failures and releases", () => {
    const s = createSim(120);
    killInstance(s);
    expect(infraText(s)).toContain("x not responding");
    for (let i = 0; i < 20; i += 1) step(s, 0.1);
    deploy(s);
    step(s, 0.1);
    expect(infraText(s)).toMatch(/rolling release -> v2|rolling release → v2/);
    if (process.env.PRINT_SCENE) console.log(infraText(s));
  });
});

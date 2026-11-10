import { describe, expect, it } from "vitest";
import { RAMPS, rampChar } from "./ramps";

describe("ramps", () => {
  it("maps endpoints of the normalized range", () => {
    expect(rampChar(RAMPS.standard, 0)).toBe(" ");
    expect(rampChar(RAMPS.standard, 1)).toBe("@");
    expect(rampChar(RAMPS.blocks, 0)).toBe(" ");
    expect(rampChar(RAMPS.blocks, 1)).toBe("█");
  });

  it("clamps out-of-range values", () => {
    expect(rampChar(RAMPS.standard, -1)).toBe(" ");
    expect(rampChar(RAMPS.standard, 2)).toBe("@");
  });

  it("maps mid values deterministically", () => {
    expect(rampChar(RAMPS.standard, 0.5)).toBe(RAMPS.standard[5]);
    expect(rampChar(RAMPS.fine, 0)).toBe(" ");
    expect(rampChar(RAMPS.fine, 1)).toBe("$");
  });
});

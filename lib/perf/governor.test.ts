import { afterEach, describe, expect, it } from "vitest";
import { scheduler } from "@/components/ascii/engine/scheduler";
import { applyTier, initialTier } from "./governor";

afterEach(() => {
  sessionStorage.clear();
  applyTier("high");
});

describe("quality governor", () => {
  it("applies a tier to the page and the animation budget", () => {
    applyTier("low");
    expect(document.documentElement.dataset.fx).toBe("low");
    expect(scheduler.fpsScale).toBeLessThan(0.5);
    applyTier("high");
    expect(scheduler.fpsScale).toBe(1);
  });

  it("remembers what this session learned", () => {
    applyTier("medium");
    expect(initialTier()).toBe("medium");
  });
});

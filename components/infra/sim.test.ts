import { describe, expect, it } from "vitest";
import {
  PARAMS,
  availability,
  createSim,
  deploy,
  desiredCapacity,
  inService,
  killInstance,
  setTraffic,
  spike,
  step,
  type SimState,
} from "./sim";

function run(s: SimState, seconds: number, watch?: (s: SimState) => void) {
  for (let t = 0; t < seconds; t += 0.1) {
    step(s, 0.1);
    watch?.(s);
  }
}

describe("desiredCapacity", () => {
  it("targets 60% CPU within the group's bounds", () => {
    expect(desiredCapacity(0)).toBe(PARAMS.minInstances);
    expect(desiredCapacity(120)).toBe(2);
    expect(desiredCapacity(300)).toBe(5);
    expect(desiredCapacity(10_000)).toBe(PARAMS.maxInstances);
  });
});

describe("auto scaling", () => {
  it("scales out under a spike, then back in after the cooldown", () => {
    const s = createSim(120);
    run(s, 5);
    expect(inService(s)).toHaveLength(2);

    spike(s); // 360 rps → 6 instances
    run(s, PARAMS.bootSeconds + 1);
    expect(inService(s)).toHaveLength(desiredCapacity(360));

    run(s, PARAMS.spikeSeconds + PARAMS.scaleInCooldown * 6);
    expect(inService(s)).toHaveLength(2);
    expect(s.events.some((e) => e.text.startsWith("scale in"))).toBe(true);
  });

  it("never exceeds the maximum group size", () => {
    const s = createSim(5000);
    run(s, 10, (x) => {
      expect(x.instances.length).toBeLessThanOrEqual(PARAMS.maxInstances + 1);
    });
  });
});

describe("failure handling", () => {
  it("replaces a crashed instance and recovers full capacity", () => {
    const s = createSim(150);
    run(s, 2);
    const id = killInstance(s);
    expect(id).not.toBeNull();
    run(s, PARAMS.detectSeconds + PARAMS.bootSeconds + 1);
    expect(inService(s)).toHaveLength(desiredCapacity(150));
    expect(s.instances.some((i) => i.id === id)).toBe(false);
    // Only requests routed to it before detection were lost.
    expect(availability(s)).toBeGreaterThan(0.9);
  });
});

describe("rolling release", () => {
  it("replaces every instance with the new version without losing capacity", () => {
    const s = createSim(150);
    run(s, 2);
    const before = s.dropped;
    expect(deploy(s)).toBe(true);
    expect(deploy(s)).toBe(false); // one release at a time
    let minInService = Infinity;
    run(s, 60, (x) => {
      minInService = Math.min(minInService, inService(x).length);
    });
    expect(s.deploying).toBe(false);
    expect(s.instances.every((i) => i.version === 2)).toBe(true);
    expect(minInService).toBeGreaterThanOrEqual(desiredCapacity(150));
    expect(s.dropped - before).toBeCloseTo(0, 6);
    expect(s.events.some((e) => e.text.includes("0 requests dropped"))).toBe(
      true,
    );
  });
});

describe("traffic", () => {
  it("drops what in-service capacity cannot serve", () => {
    const s = createSim(0);
    setTraffic(s, 1000); // far above 2 instances' capacity until scale-out lands
    step(s, 1);
    expect(s.dropped).toBeGreaterThan(0);
    expect(s.latencyMs).toBeGreaterThan(PARAMS.baseLatencyMs);
  });
});

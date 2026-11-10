import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gsap } from "@/lib/motion/gsap-setup";
import { Scheduler } from "./scheduler";

function tickAt(callback: (time: number) => void, seconds: number) {
  callback(seconds);
}

describe("Scheduler", () => {
  const originalHidden = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "hidden",
  );
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi
      .spyOn(gsap.ticker, "add")
      .mockImplementation(() => undefined as never);
    removeSpy = vi
      .spyOn(gsap.ticker, "remove")
      .mockImplementation(() => undefined as never);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalHidden) {
      Object.defineProperty(document, "hidden", originalHidden);
    }
  });

  it("adds exactly one ticker callback for two jobs and removes it when none remain", () => {
    const scheduler = new Scheduler();
    const jobA = { update: vi.fn() };
    const jobB = { update: vi.fn() };

    const handleA = scheduler.register(jobA);
    const handleB = scheduler.register(jobB);
    expect(addSpy).toHaveBeenCalledTimes(1);

    handleA.dispose();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(scheduler.activeJobCount).toBe(1);

    handleB.dispose();
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(addSpy.mock.calls[0]?.[0]);
    expect(scheduler.activeJobCount).toBe(0);
  });

  it("throttles jobs to their fps", () => {
    const scheduler = new Scheduler();
    const update = vi.fn();
    scheduler.register({ update, fps: 30 });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    tickAt(callback, 0);
    tickAt(callback, 0.01);
    tickAt(callback, 0.02);
    tickAt(callback, 0.05);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("does not update paused jobs, resumes them after resume()", () => {
    const scheduler = new Scheduler();
    const update = vi.fn();
    const handle = scheduler.register({ update, fps: 60 });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    handle.pause();
    tickAt(callback, 0);
    expect(update).not.toHaveBeenCalled();

    handle.resume();
    tickAt(callback, 0.1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("runs no work while document.hidden", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    const scheduler = new Scheduler();
    const update = vi.fn();
    scheduler.register({ update });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    tickAt(callback, 1);
    tickAt(callback, 2);
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps running other jobs when one throws, and logs the error only once per job", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const scheduler = new Scheduler();
    const good = vi.fn();
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    scheduler.register({ update: bad, fps: 60 });
    scheduler.register({ update: good, fps: 60 });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    tickAt(callback, 0);
    tickAt(callback, 0.1);
    tickAt(callback, 0.2);

    expect(good).toHaveBeenCalledTimes(3);
    expect(bad).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("clamps dtMs to at most 100 ms", () => {
    const scheduler = new Scheduler();
    const update = vi.fn();
    scheduler.register({ update, fps: 1000 });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    tickAt(callback, 0);
    tickAt(callback, 5); // 5000 ms later
    expect(update).toHaveBeenLastCalledWith(5000, 100);
  });

  it("resume() resets the job's clock so the next update gets a normal dt", () => {
    const scheduler = new Scheduler();
    const update = vi.fn();
    const handle = scheduler.register({ update, fps: 1 });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    tickAt(callback, 0);
    tickAt(callback, 1000);
    handle.pause();
    handle.resume();
    tickAt(callback, 1000.5);

    const lastCall = update.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(1000 / 30);
  });

  it("resets all jobs' clocks while document.hidden", () => {
    const scheduler = new Scheduler();
    const update = vi.fn();
    scheduler.register({ update, fps: 1 });
    const callback = addSpy.mock.calls[0]?.[0] as (time: number) => void;

    tickAt(callback, 0);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    tickAt(callback, 1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    tickAt(callback, 2);

    const lastCall = update.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(1000 / 30);
  });
});

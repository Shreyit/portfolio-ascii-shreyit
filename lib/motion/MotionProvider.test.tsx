import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gsap } from "@/lib/motion/gsap-setup";
import { MotionProvider, useLenis } from "./MotionProvider";

const lenisInstances: Array<{
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  raf: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("lenis", () => ({
  default: class MockLenis {
    on = vi.fn();
    off = vi.fn();
    destroy = vi.fn();
    raf = vi.fn();

    constructor() {
      lenisInstances.push(this);
    }
  },
}));

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function mockMatchMedia(matches: boolean) {
  const mql = {
    matches,
    media: REDUCE_QUERY,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn().mockReturnValue(mql);
}

function Probe() {
  useLenis();
  return null;
}

describe("MotionProvider", () => {
  const originalMatchMedia = window.matchMedia;
  let tickerAdd: ReturnType<typeof vi.spyOn>;
  let tickerRemove: ReturnType<typeof vi.spyOn>;
  let lagSmoothing: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    lenisInstances.length = 0;
    tickerAdd = vi
      .spyOn(gsap.ticker, "add")
      .mockImplementation((callback) => callback as never);
    tickerRemove = vi.spyOn(gsap.ticker, "remove").mockImplementation(() => {});
    lagSmoothing = vi
      .spyOn(gsap.ticker, "lagSmoothing")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  it("creates Lenis and drives it from gsap.ticker (no-preference)", async () => {
    mockMatchMedia(false);
    const { unmount } = render(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    );

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(lenisInstances).toHaveLength(1);
    expect(tickerAdd).toHaveBeenCalledTimes(1);
    expect(lagSmoothing).toHaveBeenCalledWith(0);

    const tickCallback = tickerAdd.mock.calls[0]?.[0];
    expect(typeof tickCallback).toBe("function");

    unmount();

    expect(tickerRemove).toHaveBeenCalledWith(tickCallback);
    expect(lagSmoothing).toHaveBeenCalledWith(500, 33);
    expect(lenisInstances[0]?.destroy).toHaveBeenCalledTimes(1);
  });

  it("never constructs Lenis when reduced motion is preferred", () => {
    mockMatchMedia(true);
    const { unmount } = render(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    );

    expect(lenisInstances).toHaveLength(0);
    expect(tickerAdd).not.toHaveBeenCalled();

    unmount();
    expect(tickerRemove).not.toHaveBeenCalled();
  });
});

import { scheduler } from "@/components/ascii/engine/scheduler";

export type Tier = "high" | "medium" | "low";

const ORDER: Tier[] = ["high", "medium", "low"];
/** Animation budget per tier (multiplies every scheduler job's fps). */
const FPS_SCALE: Record<Tier, number> = { high: 1, medium: 0.6, low: 0.35 };
/** A window is "slow" when its 75th-percentile frame is longer than this. */
const SLOW_FRAME_MS = 24;
const WINDOW_MS = 2000;
const STORAGE_KEY = "fx-tier";

/** Starting tier from cheap hardware hints, or what this session learned. */
export function initialTier(): Tier {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY) as Tier | null;
    if (saved && ORDER.includes(saved)) return saved;
  } catch {
    // Storage unavailable: fall through to hints.
  }
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  return cores <= 4 || (memory !== undefined && memory <= 4)
    ? "medium"
    : "high";
}

export function applyTier(tier: Tier): void {
  document.documentElement.dataset.fx = tier;
  scheduler.fpsScale = FPS_SCALE[tier];
  try {
    sessionStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // Not persisted; the governor re-learns next visit.
  }
}

/**
 * Watches real frame times and steps the effects tier down (never up, so it
 * cannot oscillate) when the page cannot hold a smooth frame rate: blur is
 * dropped first, then animation rates. Returns a stop function.
 */
export function startGovernor(): () => void {
  let tier = initialTier();
  applyTier(tier);
  let frames: number[] = [];
  let last = performance.now();
  let windowStart = last;
  let slowWindows = 0;
  let raf = 0;

  const step = (now: number) => {
    frames.push(now - last);
    last = now;
    if (now - windowStart >= WINDOW_MS) {
      // Hidden tabs and very short windows say nothing about smoothness.
      if (!document.hidden && frames.length > 20) {
        const sorted = [...frames].sort((a, b) => a - b);
        const p75 = sorted[Math.floor(sorted.length * 0.75)]!;
        slowWindows = p75 > SLOW_FRAME_MS ? slowWindows + 1 : 0;
        const next = ORDER[ORDER.indexOf(tier) + 1];
        if (slowWindows >= 2 && next) {
          tier = next;
          applyTier(tier);
          slowWindows = 0;
        }
      }
      frames = [];
      windowStart = now;
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

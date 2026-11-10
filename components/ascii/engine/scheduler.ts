import { gsap } from "../../../lib/motion/gsap-setup";

export interface SchedulerJob {
  update(timeMs: number, dtMs: number): void;
  /** Frames per second for this job (default 30). */
  fps?: number;
}

export interface SchedulerHandle {
  pause(): void;
  resume(): void;
  dispose(): void;
}

interface JobEntry {
  job: SchedulerJob;
  paused: boolean;
  lastRunMs: number | null;
  errorLogged: boolean;
}

const DEFAULT_FPS = 30;
const MAX_DT_MS = 100;

export class Scheduler {
  private jobs = new Map<number, JobEntry>();
  private nextId = 1;
  private tickerCallback: ((timeSeconds: number) => void) | null = null;

  register(job: SchedulerJob): SchedulerHandle {
    const id = this.nextId;
    this.nextId += 1;

    this.jobs.set(id, {
      job,
      paused: false,
      lastRunMs: null,
      errorLogged: false,
    });
    if (this.jobs.size === 1) {
      this.tickerCallback = (timeSeconds: number) => {
        this.tick(timeSeconds);
      };
      gsap.ticker.add(this.tickerCallback);
    }

    return {
      pause: () => {
        const entry = this.jobs.get(id);
        if (entry) {
          entry.paused = true;
        }
      },
      resume: () => {
        const entry = this.jobs.get(id);
        if (entry) {
          entry.paused = false;
          entry.lastRunMs = null;
        }
      },
      dispose: () => {
        this.jobs.delete(id);
        if (this.jobs.size === 0 && this.tickerCallback) {
          gsap.ticker.remove(this.tickerCallback);
          this.tickerCallback = null;
        }
      },
    };
  }

  get activeJobCount(): number {
    return this.jobs.size;
  }

  private tick(timeSeconds: number): void {
    if (typeof document !== "undefined" && document.hidden) {
      for (const entry of this.jobs.values()) {
        entry.lastRunMs = null;
      }
      return;
    }
    const timeMs = timeSeconds * 1000;

    for (const entry of this.jobs.values()) {
      if (entry.paused) {
        continue;
      }
      const fps = entry.job.fps ?? DEFAULT_FPS;
      const minDelta = 1000 / fps;

      if (entry.lastRunMs !== null) {
        const delta = timeMs - entry.lastRunMs;
        if (delta < minDelta) {
          continue;
        }
      }

      const rawDtMs =
        entry.lastRunMs === null
          ? 1000 / DEFAULT_FPS
          : timeMs - entry.lastRunMs;
      const dtMs = Math.min(rawDtMs, MAX_DT_MS);
      try {
        entry.job.update(timeMs, dtMs);
      } catch (error) {
        if (!entry.errorLogged) {
          entry.errorLogged = true;
          console.error("ASCII scheduler job threw:", error);
        }
      }
      entry.lastRunMs = timeMs;
    }
  }
}

export const scheduler = new Scheduler();

// Chiptune sound effects for the skill console.
// Web Audio API only — no audio files, no network, no new dependencies.
// The AudioContext is created lazily on the first playSound() call (always
// triggered by a user gesture), never on load, scroll or hover.

export type SoundName =
  | "move" // up/down blip
  | "wrap" // wrap-around at a list end (slightly lower blip)
  | "cart" // cartridge clunk + rising two-note
  | "confirm" // A inspect: bright two-note
  | "back" // B back: falling two-note
  | "select" // SELECT random: quick random arpeggio
  | "start" // START visit lab: rising three-note fanfare
  | "powerOn" // 4-5 note jingle on the first interaction of a session
  | "konami"; // victory jingle

const MASTER_LEVEL = 0.09;
/** Whole sounds (not notes) allowed to overlap; a held key can't pile up. */
export const MAX_VOICES = 3;
const STORAGE_KEY = "console-sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** Audio-clock end time of each sound still playing. */
let busy: number[] = [];
let mutedCache: boolean | null = null;

function readStoredMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  if (mutedCache === null) {
    try {
      mutedCache = readStoredMuted();
    } catch {
      mutedCache = false;
    }
  }
  return mutedCache;
}

export function setMuted(next: boolean): void {
  mutedCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "off" : "on");
  } catch {
    // Storage unavailable — the choice still applies for this session.
  }
}

export function toggleMuted(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

/** Test hook: drop the cached context/mute state. */
export function resetSoundForTests(): void {
  ctx = null;
  master = null;
  busy = [];
  mutedCache = null;
}

/** Test hook: sounds currently counted against the cap. */
export function activeVoiceCount(): number {
  return busy.length;
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) {
        return null;
      }
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

const SQUARE = "square" as const;
const TRIANGLE = "triangle" as const;

interface Note {
  freq: number;
  type: OscillatorType;
  offset: number; // seconds from now
  duration: number; // seconds
}

/** Schedules one note; returns when it ends on the audio clock. */
function note(c: AudioContext, n: Note): number {
  const t = c.currentTime + n.offset;
  const end = t + n.duration;
  if (!master) return end;
  const osc = c.createOscillator();
  osc.type = n.type;
  osc.frequency.setValueAtTime(n.freq, t);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.connect(gain);
  gain.connect(master);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  osc.start(t);
  osc.stop(end + 0.02);
  return end;
}

const ARP_POOL = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

function playFor(c: AudioContext, name: SoundName): number {
  let last = c.currentTime;
  const play = (x: Note) => {
    last = Math.max(last, note(c, x));
  };
  const n = (
    freq: number,
    type: OscillatorType,
    offset: number,
    duration: number,
  ): Note => ({
    freq,
    type,
    offset,
    duration,
  });
  switch (name) {
    case "move":
      play(n(1318.5, SQUARE, 0, 0.045));
      break;
    case "wrap":
      play(n(880, SQUARE, 0, 0.055));
      break;
    case "cart":
      // clunk: low thump, then a rising two-note chirp
      play(n(164.8, SQUARE, 0, 0.05));
      play(n(392, TRIANGLE, 0.06, 0.07));
      play(n(523.25, TRIANGLE, 0.12, 0.08));
      break;
    case "confirm":
      play(n(659.25, SQUARE, 0, 0.06));
      play(n(987.77, SQUARE, 0.07, 0.09));
      break;
    case "back":
      play(n(523.25, SQUARE, 0, 0.06));
      play(n(392, SQUARE, 0.07, 0.09));
      break;
    case "select": {
      // quick random arpeggio
      let t = 0;
      for (let i = 0; i < 4; i += 1) {
        const freq = ARP_POOL[Math.floor(Math.random() * ARP_POOL.length)]!;
        play(n(freq, SQUARE, t, 0.05));
        t += 0.045;
      }
      break;
    }
    case "start":
      play(n(523.25, TRIANGLE, 0, 0.08));
      play(n(659.25, TRIANGLE, 0.09, 0.08));
      play(n(783.99, TRIANGLE, 0.18, 0.1));
      break;
    case "powerOn":
      play(n(392, TRIANGLE, 0, 0.09));
      play(n(523.25, TRIANGLE, 0.08, 0.09));
      play(n(659.25, TRIANGLE, 0.16, 0.09));
      play(n(783.99, TRIANGLE, 0.24, 0.09));
      play(n(1046.5, TRIANGLE, 0.32, 0.16));
      break;
    case "konami":
      play(n(523.25, SQUARE, 0, 0.07));
      play(n(659.25, SQUARE, 0.08, 0.07));
      play(n(783.99, SQUARE, 0.16, 0.07));
      play(n(1046.5, SQUARE, 0.24, 0.07));
      play(n(1318.5, SQUARE, 0.32, 0.16));
      break;
  }
  return last;
}

export function playSound(name: SoundName): void {
  try {
    if (isMuted()) {
      return;
    }
    const c = ensure();
    if (!c) {
      return;
    }
    busy = busy.filter((end) => end > c.currentTime);
    if (busy.length >= MAX_VOICES) return;
    busy.push(playFor(c, name));
  } catch {
    // Audio is decorative — never break the console over it.
  }
}

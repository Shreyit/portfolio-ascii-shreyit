import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockVoice {
  onended: (() => void) | null;
  started: boolean;
}

const createdOscillators: MockVoice[] = [];
let audioContextInstances = 0;
let oscCreateCount = 0;
let lastContext: { currentTime: number } | null = null;

class MockParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class MockNode {
  connect() {}
  disconnect() {}
}

class MockOscillator extends MockNode {
  type: OscillatorType = "square";
  frequency = new MockParam();
  onended: (() => void) | null = null;
  start() {
    (this as unknown as MockVoice).started = true;
  }
  stop() {
    // Do not auto-end voices: lets tests hold them open.
  }
}

class MockGain extends MockNode {
  gain = new MockParam();
}

class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};
  constructor() {
    audioContextInstances += 1;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- tests need the instance
    lastContext = this;
  }
  createOscillator() {
    oscCreateCount += 1;
    const osc = new MockOscillator();
    createdOscillators.push(osc as unknown as MockVoice);
    return osc as unknown as OscillatorNode;
  }
  createGain() {
    return new MockGain() as unknown as GainNode;
  }
  resume() {
    return Promise.resolve();
  }
}

describe("sound", () => {
  beforeEach(() => {
    vi.resetModules();
    createdOscillators.length = 0;
    audioContextInstances = 0;
    oscCreateCount = 0;
    window.localStorage.clear();
    (
      window as unknown as { AudioContext: typeof MockAudioContext }
    ).AudioContext = MockAudioContext as never;
  });

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it("creates no AudioContext before a gesture", async () => {
    const { playSound } = await import("./sound");
    expect(audioContextInstances).toBe(0);
    playSound("move");
    expect(audioContextInstances).toBe(1);
  });

  it("stays silent when muted and plays when unmuted", async () => {
    const { isMuted, setMuted, playSound } = await import("./sound");
    expect(isMuted()).toBe(false);

    setMuted(true);
    expect(window.localStorage.getItem("console-sound")).toBe("off");
    playSound("start");
    expect(oscCreateCount).toBe(0);
    expect(audioContextInstances).toBe(0); // muted must not even open the context

    setMuted(false);
    playSound("start");
    expect(oscCreateCount).toBeGreaterThan(0);
  });

  it("caps simultaneous voices at MAX_VOICES", async () => {
    const { playSound, MAX_VOICES, activeVoiceCount } = await import("./sound");
    for (let i = 0; i < 6; i += 1) {
      playSound("select"); // 4 notes each
    }
    // Whole sounds are capped, never cut short: each plays all 4 notes.
    expect(oscCreateCount).toBe(MAX_VOICES * 4);
    expect(activeVoiceCount()).toBe(MAX_VOICES);
  });

  it("plays every note of a jingle and frees the slot when it ends", async () => {
    const { playSound, MAX_VOICES, activeVoiceCount } = await import("./sound");
    playSound("powerOn");
    expect(oscCreateCount).toBe(5);
    for (let i = 0; i < MAX_VOICES; i += 1) playSound("move");
    expect(activeVoiceCount()).toBe(MAX_VOICES);
    expect(oscCreateCount).toBe(5 + MAX_VOICES - 1);

    lastContext!.currentTime = 1; // every sound above has finished
    playSound("move");
    expect(activeVoiceCount()).toBe(1);
  });

  it("persists the mute choice in localStorage and falls back silently", async () => {
    const { setMuted } = await import("./sound");
    setMuted(true);
    vi.resetModules();
    const fresh = await import("./sound");
    expect(fresh.isMuted()).toBe(true);
    setMuted(false);
    expect(window.localStorage.getItem("console-sound")).toBe("on");
  });

  it("toggleMuted flips and stores the choice", async () => {
    const { toggleMuted, isMuted } = await import("./sound");
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
    expect(isMuted()).toBe(false);
  });
});

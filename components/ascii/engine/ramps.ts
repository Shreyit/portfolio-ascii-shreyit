export const RAMPS = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  fine: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;

export type RampName = keyof typeof RAMPS;

export function rampChar(ramp: string, value01: number): string {
  const clamped = Math.min(1, Math.max(0, value01));
  const index = Math.min(ramp.length - 1, Math.floor(clamped * ramp.length));
  return ramp.charAt(index);
}

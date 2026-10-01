import type { GradientStop } from "@/lib/types.ts";

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length !== 6) {
    return [0, 0, 0];
  }
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!isHexColor(withHash)) return null;
  const [red, green, blue] = hexToRgb(withHash);
  const channel = (channelValue: number) => channelValue.toString(16).padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

export function mixHex(a: string, b: string, amount = 0.5): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

export function toCssGradient(stops: GradientStop[]): string {
  const ordered = [...stops].sort((a, b) => a.at - b.at);
  const parts = ordered.map((stop) => `${stop.color} ${Math.round(stop.at * 100)}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function sameStops(a: GradientStop[], b: GradientStop[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (stop, index) =>
      stop.at === b[index]?.at && stop.color.toLowerCase() === b[index]?.color.toLowerCase(),
  );
}

export function cycleSeconds(speed: number): number {
  const clamped = Math.min(1, Math.max(0, speed));
  const slow = 16;
  const fast = 0.7;
  return slow * (fast / slow) ** clamped;
}

export function formatCycle(seconds: number): string {
  if (seconds >= 10) return `${seconds.toFixed(0)}s cycle`;
  return `${seconds.toFixed(1)}s cycle`;
}

export function formatRate(rate: number): string {
  return `${rate.toFixed(2)}×`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

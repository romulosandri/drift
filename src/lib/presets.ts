import type { GradientStop } from "@/lib/types.ts";

export type Preset = {
  id: string;
  name: string;
  stops: GradientStop[];
};

export const PRESETS: Preset[] = [
  {
    id: "ash",
    name: "Ash",
    stops: [
      { color: "#0c0c0c", at: 0 },
      { color: "#f4f4f5", at: 1 },
    ],
  },
  {
    id: "ink",
    name: "Ink",
    stops: [
      { color: "#05060a", at: 0 },
      { color: "#8e9bb3", at: 0.5 },
      { color: "#f7f8fb", at: 1 },
    ],
  },
  {
    id: "ember",
    name: "Ember",
    stops: [
      { color: "#1a0704", at: 0 },
      { color: "#ff4d1a", at: 0.55 },
      { color: "#ffd8b8", at: 1 },
    ],
  },
  {
    id: "tide",
    name: "Tide",
    stops: [
      { color: "#031018", at: 0 },
      { color: "#1b6cb5", at: 0.5 },
      { color: "#d5f2ff", at: 1 },
    ],
  },
  {
    id: "orchid",
    name: "Orchid",
    stops: [
      { color: "#140616", at: 0 },
      { color: "#a23ad8", at: 0.52 },
      { color: "#f6d2ff", at: 1 },
    ],
  },
  {
    id: "moss",
    name: "Moss",
    stops: [
      { color: "#0a130c", at: 0 },
      { color: "#2f7a42", at: 0.5 },
      { color: "#e4f5c8", at: 1 },
    ],
  },
  {
    id: "honey",
    name: "Honey",
    stops: [
      { color: "#1a1004", at: 0 },
      { color: "#e2a20a", at: 0.55 },
      { color: "#fff1c2", at: 1 },
    ],
  },
  {
    id: "dusk",
    name: "Dusk",
    stops: [
      { color: "#140810", at: 0 },
      { color: "#d23a62", at: 0.5 },
      { color: "#f7c7a4", at: 1 },
    ],
  },
  {
    id: "cobalt",
    name: "Cobalt",
    stops: [
      { color: "#040712", at: 0 },
      { color: "#2a45f5", at: 0.48 },
      { color: "#d5dcff", at: 1 },
    ],
  },
  {
    id: "copper",
    name: "Copper",
    stops: [
      { color: "#140c08", at: 0 },
      { color: "#c4622d", at: 0.55 },
      { color: "#f3d2b8", at: 1 },
    ],
  },
];

export const PASSAGES = [
  { id: "tide-ember", name: "Tide to ember", from: "tide", to: "ember" },
  { id: "ash-honey", name: "Ash to honey", from: "ash", to: "honey" },
  { id: "ink-orchid", name: "Ink to orchid", from: "ink", to: "orchid" },
  { id: "moss-dusk", name: "Moss to dusk", from: "moss", to: "dusk" },
] as const;

export function presetById(id: string): Preset {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}

export function cloneStops(stops: GradientStop[]): GradientStop[] {
  return stops.map((stop) => ({ color: stop.color, at: stop.at }));
}

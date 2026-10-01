import type { AspectChoice, FitMode, LoadedMedia } from "@/lib/types.ts";

export const ASPECT_CHOICES: { id: AspectChoice; label: string; value: number | null }[] = [
  { id: "original", label: "Original", value: null },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
];

export const FIT_MODES: { id: FitMode; label: string; body: string }[] = [
  { id: "fill", label: "Fill", body: "Cover the frame. What does not fit is cropped." },
  { id: "fit", label: "Fit", body: "Stretch the picture so it meets every edge." },
  { id: "contain", label: "Contain", body: "Show the whole picture. Empty space stays black." },
];

export function aspectRatio(choice: AspectChoice, media: LoadedMedia | null): number {
  const selected = ASPECT_CHOICES.find((item) => item.id === choice);
  if (!selected || selected.value === null) {
    if (media && media.width > 0 && media.height > 0) return media.width / media.height;
    return 16 / 9;
  }
  return selected.value;
}

export function aspectLabel(choice: AspectChoice): string {
  return ASPECT_CHOICES.find((item) => item.id === choice)?.label ?? "16:9";
}

export function frameSpan(fit: FitMode, sourceAspect: number, frameAspect: number): [number, number] {
  const safeSource = Math.max(0.001, sourceAspect);
  const safeFrame = Math.max(0.001, frameAspect);
  switch (fit) {
    case "fit":
      return [1, 1];
    case "contain":
      if (safeSource > safeFrame) return [1, safeFrame / safeSource];
      return [safeSource / safeFrame, 1];
    case "fill":
      if (safeSource > safeFrame) return [safeSource / safeFrame, 1];
      return [1, safeFrame / safeSource];
    default: {
      const unreachable: never = fit;
      return unreachable;
    }
  }
}

export function exportPixelSize(ratio: number): { width: number; height: number } {
  const longEdge = 1920;
  const even = (value: number) => {
    const rounded = Math.max(2, Math.round(value));
    return rounded % 2 === 0 ? rounded : rounded - 1;
  };
  if (ratio >= 1) {
    return { width: longEdge, height: even(longEdge / ratio) };
  }
  return { width: even(longEdge * ratio), height: longEdge };
}

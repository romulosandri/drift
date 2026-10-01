import { createContext, useContext, type DragEvent, type ReactNode, type RefObject } from "react";

import type { AspectChoice, EditTarget, FitMode, GradientStop, LoadedMedia, MotionMode } from "@/lib/types.ts";

export type StudioApi = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  phaseRef: RefObject<number>;
  media: LoadedMedia | null;
  loading: boolean;
  error: string | null;
  glError: string | null;
  dragging: boolean;
  exporting: boolean;
  playing: boolean;
  currentTime: number;
  gradeA: GradientStop[];
  gradeB: GradientStop[];
  activeStops: GradientStop[];
  mode: MotionMode;
  editTarget: EditTarget;
  shiftSpeed: number;
  animate: boolean;
  contrast: number;
  playbackRate: number;
  loop: boolean;
  muted: boolean;
  keepPitch: boolean;
  aspect: AspectChoice;
  fit: FitMode;
  imageDuration: number;
  setMode: (mode: MotionMode) => void;
  setEditTarget: (target: EditTarget) => void;
  setShiftSpeed: (speed: number) => void;
  setAnimate: (value: boolean) => void;
  setContrast: (value: number) => void;
  setPlaybackRate: (value: number) => void;
  setLoop: (value: boolean) => void;
  setMuted: (value: boolean) => void;
  setKeepPitch: (value: boolean) => void;
  setAspect: (value: AspectChoice) => void;
  setFit: (value: FitMode) => void;
  setImageDuration: (value: number) => void;
  applyPreset: (id: string) => void;
  applyPassage: (from: string, to: string) => void;
  updateStop: (index: number, color: string) => void;
  addMidtone: () => void;
  removeMidtone: () => void;
  restartShift: () => void;
  openFilePicker: () => void;
  clearMedia: () => void;
  togglePlay: () => void;
  scrub: (time: number) => void;
  exportMovie: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

const StudioContext = createContext<StudioApi | null>(null);

export function StudioProvider({ value, children }: { value: StudioApi; children: ReactNode }) {
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioApi {
  const value = useContext(StudioContext);
  if (!value) {
    throw new Error("Studio controls rendered outside the studio.");
  }
  return value;
}

export type MotionMode = "blend" | "sweep";

export type EditTarget = "a" | "b";

export type FitMode = "fill" | "fit" | "contain";

export type AspectChoice = "original" | "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "3:2";

export type GradientStop = {
  color: string;
  at: number;
};

export type LoadedMedia = {
  kind: "image" | "video";
  name: string;
  url: string;
  revoke: boolean;
  width: number;
  height: number;
  duration: number | null;
};

export type RenderSnapshot = {
  gradeA: GradientStop[];
  gradeB: GradientStop[];
  mode: MotionMode;
  shiftSpeed: number;
  animate: boolean;
  contrast: number;
  fit: FitMode;
  media: LoadedMedia | null;
};

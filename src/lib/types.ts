export type MotionMode = "blend" | "sweep";

export type EditTarget = "a" | "b";

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
  media: LoadedMedia | null;
};

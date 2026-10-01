import { ALL_FORMATS, BlobSource, BufferTarget, CanvasSink, CanvasSource, Input, Mp4OutputFormat, Output, Quality, getFirstEncodableVideoCodec } from "mediabunny";

import { clampPlaybackRate, cycleSeconds, easeFrameMix } from "@/lib/color.ts";
import { exportPixelSize } from "@/lib/frame.ts";
import { GradientMapRenderer } from "@/lib/gradient-map.ts";
import type { FitMode, GradientStop, LoadedMedia, MotionMode } from "@/lib/types.ts";

const FPS = 30;
const MAX_SECONDS = 120;

export type ExportRequest = {
  media: LoadedMedia;
  image: HTMLImageElement | HTMLCanvasElement | null;
  gradeA: GradientStop[];
  gradeB: GradientStop[];
  mode: MotionMode;
  shiftSpeed: number;
  animate: boolean;
  contrast: number;
  fit: FitMode;
  aspect: number;
  playbackRate: number;
  imageDuration: number;
};

function easedPhase(cycle: number): number {
  return (1 - Math.cos(cycle * Math.PI * 2)) / 2;
}

function waitForEvent(target: HTMLVideoElement, eventName: "loadeddata" | "seeked" | "error"): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("The video frame took too long to load."));
    }, 8000);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("This video could not be read for export."));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      target.removeEventListener(eventName, onReady);
      target.removeEventListener("error", onError);
    };
    target.addEventListener(eventName, onReady);
    if (eventName !== "error") target.addEventListener("error", onError);
  });
}

async function seekTo(video: HTMLVideoElement, time: number) {
  const duration = Number.isFinite(video.duration) ? video.duration : time;
  const target = Math.min(Math.max(0, time), Math.max(0, duration - 0.04));
  if (Math.abs(video.currentTime - target) < 0.0004 && video.readyState >= 2) return;
  const pending = waitForEvent(video, "seeked");
  video.currentTime = target;
  await pending;
  await new Promise((resolve) => {
    requestAnimationFrame(() => resolve(undefined));
  });
}

type DecodedFrame = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
};

type DecodedPull = {
  next: () => Promise<DecodedFrame | null>;
  close: () => void;
};

function sourceTimestamps(frameCount: number, sourceDuration: number, playbackRate: number): number[] {
  const rate = clampPlaybackRate(playbackRate);
  const last = Math.max(0, sourceDuration - 0.001);
  return Array.from({ length: frameCount }, (_, index) => Math.min(last, (index / FPS) * rate));
}

type HeldFrames = {
  frameAt: (time: number) => Promise<DecodedFrame>;
  frameDuration: number;
  close: () => void;
};

async function openHeldFrames(url: string): Promise<HeldFrames | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const input = new Input({
    source: new BlobSource(await response.blob()),
    formats: ALL_FORMATS,
  });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) {
      input.dispose();
      return null;
    }
    const metrics = await track.computeFrameRateMetrics();
    const fps = metrics.underlyingFrameRate ?? metrics.bestGuessFrameRate;
    const frameDuration = fps > 1 && fps < 240 ? 1 / fps : 1 / 30;
    const sink = new CanvasSink(track, { poolSize: 1 });
    const holds = [document.createElement("canvas"), document.createElement("canvas")];
    const keys = [Number.NaN, Number.NaN];
    let slot = 0;
    return {
      frameDuration,
      async frameAt(time: number) {
        const key = Math.round(Math.max(0, time) * 1000);
        for (let index = 0; index < holds.length; index += 1) {
          const hold = holds[index];
          if (hold && keys[index] === key) return { canvas: hold, width: hold.width, height: hold.height };
        }
        const wrapped = await sink.getCanvas(Math.max(0, time));
        if (!wrapped) throw new Error("A video frame could not be decoded.");
        const dest = holds[slot];
        if (!dest) throw new Error("A video frame could not be decoded.");
        keys[slot] = key;
        slot = slot === 0 ? 1 : 0;
        dest.width = wrapped.canvas.width;
        dest.height = wrapped.canvas.height;
        const context = dest.getContext("2d");
        if (!context) throw new Error("A video frame could not be decoded.");
        context.drawImage(wrapped.canvas, 0, 0);
        return { canvas: dest, width: dest.width, height: dest.height };
      },
      close() {
        input.dispose();
      },
    };
  } catch {
    input.dispose();
    return null;
  }
}

async function openDecodedPull(url: string, timestamps: number[]): Promise<DecodedPull | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const input = new Input({
    source: new BlobSource(await response.blob()),
    formats: ALL_FORMATS,
  });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) {
      input.dispose();
      return null;
    }
    const sink = new CanvasSink(track, { poolSize: 2 });
    const iterator = sink.canvasesAtTimestamps(timestamps);
    return {
      async next() {
        const step = await iterator.next();
        if (step.done || !step.value) return null;
        const canvas = step.value.canvas;
        return { canvas, width: canvas.width, height: canvas.height };
      },
      close() {
        input.dispose();
      },
    };
  } catch {
    input.dispose();
    return null;
  }
}

async function openExportVideo(url: string, width: number, height: number): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  video.width = width;
  video.height = height;
  video.style.position = "fixed";
  video.style.left = "-12000px";
  video.style.top = "0";
  video.style.width = `${width}px`;
  video.style.height = `${height}px`;
  video.style.opacity = "0";
  document.body.appendChild(video);
  const ready = waitForEvent(video, "loadeddata");
  video.src = url;
  video.load();
  await ready;
  video.pause();
  return video;
}

export async function renderExport(request: ExportRequest): Promise<Blob> {
  const sourceDuration = request.media.kind === "video" ? request.media.duration : request.imageDuration;
  if (!sourceDuration || sourceDuration <= 0) {
    throw new Error("This file has no duration to export.");
  }
  const outputSeconds =
    request.media.kind === "video" ? sourceDuration / clampPlaybackRate(request.playbackRate) : request.imageDuration;
  if (outputSeconds > MAX_SECONDS) {
    throw new Error("Exports stay within 2 minutes. Shorten the still, or play the video faster.");
  }

  const { width, height } = exportPixelSize(request.aspect);
  const canvas = document.createElement("canvas");
  const renderer = new GradientMapRenderer(canvas);
  renderer.resizePixels(width, height);

  let exportVideo: HTMLVideoElement | null = null;
  let decoded: DecodedPull | null = null;
  let held: HeldFrames | null = null;
  let open = false;
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  try {
    const pixels = width * height;
    const bitrate = Math.round(Math.min(20_000_000, Math.max(8_000_000, 18_000_000 * (pixels / (1920 * 1080)))));
    const quality = new Quality({ bitrate, bitrateMode: "variable" });
    const codec = await getFirstEncodableVideoCodec(["avc"], { width, height, quality });
    if (!codec) throw new Error("This browser cannot encode an MP4.");

    const frames = new CanvasSource(canvas, {
      codec,
      quality,
      keyFrameInterval: 2,
    });
    const frameCount = Math.max(1, Math.round(outputSeconds * FPS));
    output.addVideoTrack(frames, { frameRate: FPS, maximumPacketCount: frameCount + 8 });
    await output.start();
    open = true;

    const image = request.media.kind === "image" ? request.image : null;
    if (request.media.kind === "image" && !image) throw new Error("The still is not ready to export.");
    if (request.media.kind === "video") {
      if (!request.media.url) throw new Error("The video is not ready to export.");
      const rate = clampPlaybackRate(request.playbackRate);
      if (rate < 0.999) held = await openHeldFrames(request.media.url);
      if (!held) {
        decoded = await openDecodedPull(request.media.url, sourceTimestamps(frameCount, sourceDuration, rate));
        if (!decoded) {
          exportVideo = await openExportVideo(request.media.url, request.media.width, request.media.height);
        }
      }
    }

    const period = cycleSeconds(request.shiftSpeed);
    const rate = clampPlaybackRate(request.playbackRate);
    for (let index = 0; index < frameCount; index += 1) {
      const outputTime = index / FPS;
      const cycle = request.animate ? (outputTime / period) % 1 : 0;
      let source: TexImageSource | null = image;
      let sourceWidth = request.media.width;
      let sourceHeight = request.media.height;
      let frameMix = 1;
      if (held) {
        const sourceTime = Math.min(Math.max(0, sourceDuration - 0.001), outputTime * rate);
        const start = Math.floor(sourceTime / held.frameDuration) * held.frameDuration;
        const end = Math.min(sourceDuration - 0.001, start + held.frameDuration);
        const fraction = end <= start ? 1 : Math.min(1, (sourceTime - start) / held.frameDuration);
        const first = await held.frameAt(start);
        if (fraction > 0.001 && end > start + 0.0001) {
          renderer.draw({
            source: first.canvas,
            sourceWidth: first.width,
            sourceHeight: first.height,
            gradeA: request.gradeA,
            gradeB: request.gradeB,
            mode: request.mode,
            phase: easedPhase(cycle),
            contrast: request.contrast,
            fit: request.fit,
            frameMix: 1,
            captureFrame: true,
          });
          const second = await held.frameAt(end);
          source = second.canvas;
          sourceWidth = second.width;
          sourceHeight = second.height;
          frameMix = easeFrameMix(fraction);
        } else {
          source = first.canvas;
          sourceWidth = first.width;
          sourceHeight = first.height;
        }
      } else if (decoded) {
        const frame = await decoded.next();
        if (!frame) throw new Error("A video frame could not be decoded.");
        source = frame.canvas;
        sourceWidth = frame.width;
        sourceHeight = frame.height;
      } else if (exportVideo) {
        await seekTo(exportVideo, Math.min(Math.max(0, sourceDuration - 0.001), outputTime * rate));
        source = exportVideo;
      }
      if (!source) throw new Error("Nothing is loaded to export.");
      renderer.draw({
        source,
        sourceWidth,
        sourceHeight,
        gradeA: request.gradeA,
        gradeB: request.gradeB,
        mode: request.mode,
        phase: easedPhase(cycle),
        contrast: request.contrast,
        fit: request.fit,
        frameMix,
        captureFrame: true,
      });
      await frames.add(outputTime, 1 / FPS);
    }

    await output.finalize();
    open = false;
    const buffer = target.buffer;
    if (!buffer) throw new Error("The export file was empty.");
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    if (open) await output.cancel().catch(() => undefined);
    decoded?.close();
    held?.close();
    renderer.destroy();
    if (exportVideo) {
      exportVideo.pause();
      exportVideo.removeAttribute("src");
      exportVideo.load();
      exportVideo.remove();
    }
  }
}

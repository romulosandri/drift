import { useEffect, useRef, useState, type RefObject } from "react";

import { cycleSeconds, easeFrameMix } from "@/lib/color.ts";
import { GradientMapRenderer } from "@/lib/gradient-map.ts";
import type { LoadedMedia, RenderSnapshot } from "@/lib/types.ts";

type LoopInput = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  snapshotRef: RefObject<RenderSnapshot>;
  imageRef: RefObject<HTMLImageElement | HTMLCanvasElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
};

function sourceFor(media: LoadedMedia | null, image: HTMLImageElement | HTMLCanvasElement | null, video: HTMLVideoElement | null) {
  if (!media) return null;
  if (media.kind === "video") return video;
  return image;
}

export function useGradientLoop({ canvasRef, snapshotRef, imageRef, videoRef }: LoopInput) {
  const phaseRef = useRef(0);
  const restartRef = useRef(false);
  const [glError, setGlError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: GradientMapRenderer;
    try {
      renderer = new GradientMapRenderer(canvas);
    } catch (error) {
      setGlError(error instanceof Error ? error.message : "WebGL failed to start.");
      return;
    }

    let frameId = 0;
    let last = performance.now();
    let cycle = 0;
    let lastMediaTime = -1;
    let frameGap = 0.12;
    let blendStart = 0;
    let heldMix = 1;
    let blending = false;
    let havePresented = false;
    let presentedAt = 0;
    let pendingWall: number | null = null;
    let watchId = 0;
    let watched: HTMLVideoElement | null = null;

    const stopWatch = () => {
      if (watched && watchId) watched.cancelVideoFrameCallback(watchId);
      watchId = 0;
      watched = null;
    };

    const armWatch = (video: HTMLVideoElement) => {
      if (watched === video) return;
      stopWatch();
      if (typeof video.requestVideoFrameCallback !== "function") return;
      watched = video;
      const onPresented = (now: number) => {
        watchId = video.requestVideoFrameCallback(onPresented);
        const rate = video.playbackRate || 1;
        if (rate >= 0.999 || video.paused) return;
        pendingWall = havePresented ? (now - presentedAt) / 1000 : 0;
        presentedAt = now;
        havePresented = true;
      };
      watchId = video.requestVideoFrameCallback(onPresented);
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const snapshot = snapshotRef.current;
      if (restartRef.current) {
        cycle = 0;
        restartRef.current = false;
      } else if (snapshot.animate && snapshot.media) {
        cycle = (cycle + dt / cycleSeconds(snapshot.shiftSpeed)) % 1;
      }
      const phase = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
      phaseRef.current = phase;

      const source = sourceFor(snapshot.media, imageRef.current, videoRef.current);
      const video = snapshot.media?.kind === "video" && source instanceof HTMLVideoElement ? source : null;
      let captureFrame = false;
      if (video && video.readyState >= 2 && video.videoWidth >= 2) {
        armWatch(video);
        const rate = video.playbackRate || 1;
        const time = video.currentTime;
        const seeked = lastMediaTime >= 0 && Math.abs(time - lastMediaTime) > 0.25;
        const canBlend = rate < 0.999 && typeof video.requestVideoFrameCallback === "function";
        if (!canBlend || seeked) {
          captureFrame = true;
          heldMix = 1;
          blending = false;
          havePresented = false;
          pendingWall = null;
        } else if (video.paused) {
          pendingWall = null;
          havePresented = false;
        } else if (pendingWall !== null) {
          const wall = pendingWall;
          pendingWall = null;
          captureFrame = true;
          if (wall > 0.05) {
            frameGap = Math.min(Math.max(wall, 0.05), 1.5);
            blendStart = now;
            heldMix = 0;
            blending = true;
          } else {
            heldMix = 1;
            blending = false;
          }
        } else if (blending) {
          const linear = Math.min(1, (now - blendStart) / 1000 / Math.max(frameGap, 0.001));
          heldMix = easeFrameMix(linear);
          if (heldMix >= 0.999) blending = false;
        } else if (!havePresented) {
          captureFrame = true;
          heldMix = 1;
        }
        lastMediaTime = time;
      } else if (!video) {
        lastMediaTime = -1;
        havePresented = false;
        pendingWall = null;
        blending = false;
        heldMix = 1;
        stopWatch();
      }

      if (snapshot.media && source && snapshot.media.width > 0 && snapshot.media.height > 0) {
        try {
          renderer.draw({
            source,
            sourceWidth: snapshot.media.width,
            sourceHeight: snapshot.media.height,
            gradeA: snapshot.gradeA,
            gradeB: snapshot.gradeB,
            mode: snapshot.mode,
            phase,
            contrast: snapshot.contrast,
            fit: snapshot.fit,
            frameMix: heldMix,
            captureFrame,
          });
        } catch (error) {
          console.error(error);
        }
      } else {
        renderer.clear();
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
      stopWatch();
      observer.disconnect();
      renderer.destroy();
    };
  }, [canvasRef, imageRef, snapshotRef, videoRef]);

  return {
    phaseRef,
    glError,
    restartShift() {
      restartRef.current = true;
    },
  };
}

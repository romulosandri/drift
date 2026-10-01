import { useEffect, useRef, useState, type RefObject } from "react";

import { cycleSeconds } from "@/lib/color.ts";
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
    let lastFrameCount = -1;
    let lastMediaTime = -1;
    let frameStamp = 0;
    let frameGap = 0.12;

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
      let frameMix = 1;
      let captureFrame = false;
      const video = snapshot.media?.kind === "video" && source instanceof HTMLVideoElement ? source : null;
      if (video) {
        const rate = video.playbackRate || 1;
        const time = video.currentTime;
        const presented = video.getVideoPlaybackQuality?.().totalVideoFrames;
        const knownCount = typeof presented === "number" && Number.isFinite(presented);
        const ready = video.readyState >= 2 && video.videoWidth >= 2;
        const seeked = lastMediaTime >= 0 && Math.abs(time - lastMediaTime) > 0.08;
        const advanced = knownCount && lastFrameCount >= 0 && presented !== lastFrameCount;
        if (!ready) {
          captureFrame = false;
        } else if (!knownCount || lastFrameCount < 0 || advanced || seeked) {
          captureFrame = true;
          if (advanced && !seeked && !video.paused && rate < 0.999) {
            const wall = (now - frameStamp) / 1000;
            if (wall > 0.045) frameGap = Math.min(Math.max(wall, 0.05), 0.85);
            frameMix = wall > 0.045 ? 0 : 1;
          }
          frameStamp = now;
          if (knownCount) lastFrameCount = presented;
          lastMediaTime = time;
        } else if (rate < 0.999) {
          const linear = Math.min(1, (now - frameStamp) / 1000 / Math.max(frameGap, 0.001));
          frameMix = linear * linear * (3 - 2 * linear);
          lastMediaTime = time;
        } else {
          lastMediaTime = time;
        }
      } else {
        lastFrameCount = -1;
        lastMediaTime = -1;
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
            frameMix,
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

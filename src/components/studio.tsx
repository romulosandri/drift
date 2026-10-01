import { motion } from "motion/react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { Controls } from "@/components/controls.tsx";
import { Stage } from "@/components/stage.tsx";
import { StudioProvider, type StudioApi } from "@/components/studio-context.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useGradientLoop } from "@/hooks/use-gradient-loop.ts";
import { mixHex } from "@/lib/color.ts";
import { downloadBlob, isMediaFile } from "@/lib/download.ts";
import { cloneStops, presetById } from "@/lib/presets.ts";
import { createStudioStill } from "@/lib/studio-still.ts";
import type { EditTarget, GradientStop, LoadedMedia, MotionMode, RenderSnapshot } from "@/lib/types.ts";

function fileStem(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").toLowerCase();
  return stem || "drift";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type VideoWithPitch = HTMLVideoElement & { webkitPreservesPitch?: boolean };

export function Studio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<LoadedMedia | null>(null);
  const loadId = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const playbackRateRef = useRef(1);
  const loopRef = useRef(true);
  const mutedRef = useRef(true);
  const pitchRef = useRef(true);

  const [media, setMedia] = useState<LoadedMedia | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [gradeA, setGradeA] = useState(() => cloneStops(presetById("tide").stops));
  const [gradeB, setGradeB] = useState(() => cloneStops(presetById("ember").stops));
  const [mode, setMode] = useState<MotionMode>("blend");
  const [editTarget, setEditTarget] = useState<EditTarget>("a");
  const [shiftSpeed, setShiftSpeed] = useState(0.38);
  const [animate, setAnimate] = useState(() => !prefersReducedMotion());
  const [contrast, setContrast] = useState(1.15);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(true);
  const [keepPitch, setKeepPitch] = useState(true);

  const recordSupported = typeof MediaRecorder !== "undefined";
  const activeStops = mode === "sweep" || editTarget === "a" ? gradeA : gradeB;

  playbackRateRef.current = playbackRate;
  loopRef.current = loop;
  mutedRef.current = muted;
  pitchRef.current = keepPitch;
  mediaRef.current = media;

  const snapshotRef = useRef<RenderSnapshot>({
    gradeA,
    gradeB,
    mode,
    shiftSpeed,
    animate,
    contrast,
    media,
  });
  snapshotRef.current = { gradeA, gradeB, mode, shiftSpeed, animate, contrast, media };

  const { phaseRef, glError, restartShift } = useGradientLoop({
    canvasRef,
    snapshotRef,
    imageRef,
    videoRef,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
    video.loop = loop;
    video.muted = muted;
    video.preservesPitch = keepPitch;
    const withPitch: VideoWithPitch = video;
    withPitch.webkitPreservesPitch = keepPitch;
  }, [playbackRate, loop, muted, keepPitch, media]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      const video = videoRef.current;
      if (mediaRef.current?.kind === "video" && video) {
        if (video.paused) void video.play().catch(() => undefined);
        else video.pause();
        return;
      }
      setAnimate((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => {
      const current = mediaRef.current;
      if (current?.revoke && current.url) URL.revokeObjectURL(current.url);
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    };
  }, []);

  function releaseCurrent() {
    const current = mediaRef.current;
    if (current?.revoke && current.url) URL.revokeObjectURL(current.url);
    mediaRef.current = null;
    setMedia(null);
  }

  function stopVideoElement() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function applyPitch(video: HTMLVideoElement) {
    video.playbackRate = playbackRateRef.current;
    video.loop = loopRef.current;
    video.muted = mutedRef.current;
    video.preservesPitch = pitchRef.current;
    const withPitch: VideoWithPitch = video;
    withPitch.webkitPreservesPitch = pitchRef.current;
  }

  function loadVideoElement(url: string, name: string, revoke: boolean, generation: number) {
    const video = videoRef.current;
    if (!video) return Promise.reject(new Error("Player is not ready."));

    return new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        if (generation !== loadId.current) {
          if (revoke) URL.revokeObjectURL(url);
          resolve();
          return;
        }
        imageRef.current = null;
        applyPitch(video);
        const next: LoadedMedia = {
          kind: "video",
          name,
          url,
          revoke,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: Number.isFinite(video.duration) ? video.duration : null,
        };
        mediaRef.current = next;
        setMedia(next);
        setCurrentTime(0);
        restartShift();
        void video.play().catch(() => undefined);
        resolve();
      };
      const onError = () => {
        cleanup();
        if (revoke) URL.revokeObjectURL(url);
        if (generation !== loadId.current) {
          resolve();
          return;
        }
        reject(new Error("This video could not be read. Try an MP4 or WebM."));
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("error", onError);
      video.pause();
      video.src = url;
      video.load();
    });
  }

  async function loadImageElement(url: string, name: string, revoke: boolean, generation: number) {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      if (revoke) URL.revokeObjectURL(url);
      throw new Error("This image could not be read. Try a JPG, PNG, or WebP.");
    }
    if (generation !== loadId.current) {
      if (revoke) URL.revokeObjectURL(url);
      return;
    }
    stopVideoElement();
    imageRef.current = image;
    const next: LoadedMedia = {
      kind: "image",
      name,
      url,
      revoke,
      width: image.naturalWidth,
      height: image.naturalHeight,
      duration: null,
    };
    mediaRef.current = next;
    setMedia(next);
    setPlaying(false);
    setCurrentTime(0);
    restartShift();
  }

  async function loadFile(file: File) {
    if (!isMediaFile(file)) {
      setError("Use an image or a video file.");
      return;
    }
    const generation = ++loadId.current;
    setLoading(true);
    setError(null);
    stopRecording();
    releaseCurrent();
    const url = URL.createObjectURL(file);
    const videoFile = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    try {
      if (videoFile) await loadVideoElement(url, file.name, true, generation);
      else await loadImageElement(url, file.name, true, generation);
    } catch (loadError) {
      if (generation !== loadId.current) return;
      setError(loadError instanceof Error ? loadError.message : "Could not read that file.");
    } finally {
      if (generation === loadId.current) setLoading(false);
    }
  }

  function loadStill() {
    const generation = ++loadId.current;
    stopRecording();
    releaseCurrent();
    stopVideoElement();
    try {
      const still = createStudioStill();
      if (generation !== loadId.current) return;
      imageRef.current = still;
      const next: LoadedMedia = {
        kind: "image",
        name: "Studio still",
        url: "",
        revoke: false,
        width: still.width,
        height: still.height,
        duration: null,
      };
      mediaRef.current = next;
      setMedia(next);
      setError(null);
      setPlaying(false);
      setCurrentTime(0);
      setLoading(false);
      restartShift();
    } catch (stillError) {
      setError(stillError instanceof Error ? stillError.message : "Could not draw the studio still.");
    }
  }

  async function loadDemo() {
    const generation = ++loadId.current;
    setLoading(true);
    setError(null);
    stopRecording();
    releaseCurrent();
    try {
      await loadVideoElement("/demo.mp4", "Demo reel", false, generation);
    } catch (demoError) {
      if (generation !== loadId.current) return;
      setError(demoError instanceof Error ? demoError.message : "Could not load the demo reel.");
    } finally {
      if (generation === loadId.current) setLoading(false);
    }
  }

  function clearMedia() {
    loadId.current += 1;
    stopRecording();
    releaseCurrent();
    imageRef.current = null;
    stopVideoElement();
    setPlaying(false);
    setCurrentTime(0);
    setError(null);
    setLoading(false);
  }

  function setActiveStops(stops: GradientStop[]) {
    if (mode === "sweep" || editTarget === "a") setGradeA(stops);
    else setGradeB(stops);
  }

  function updateStop(index: number, color: string) {
    const update = (stops: GradientStop[]) =>
      stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, color } : stop));
    if (mode === "sweep" || editTarget === "a") setGradeA(update);
    else setGradeB(update);
  }

  function addMidtone() {
    if (activeStops.length >= 3) return;
    const shadow = activeStops[0];
    const highlight = activeStops[activeStops.length - 1];
    if (!shadow || !highlight) return;
    setActiveStops([
      { color: shadow.color, at: 0 },
      { color: mixHex(shadow.color, highlight.color), at: 0.5 },
      { color: highlight.color, at: 1 },
    ]);
  }

  function removeMidtone() {
    if (activeStops.length < 3) return;
    const shadow = activeStops[0];
    const highlight = activeStops[activeStops.length - 1];
    if (!shadow || !highlight) return;
    setActiveStops([
      { color: shadow.color, at: 0 },
      { color: highlight.color, at: 1 },
    ]);
  }

  function applyPreset(id: string) {
    setActiveStops(cloneStops(presetById(id).stops));
  }

  function applyPassage(from: string, to: string) {
    setMode("blend");
    setGradeA(cloneStops(presetById(from).stops));
    setGradeB(cloneStops(presetById(to).stops));
    setEditTarget("a");
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || media?.kind !== "video") return;
    if (video.paused) void video.play().catch(() => setError("The video could not start. Try pressing play again."));
    else video.pause();
  }

  function scrub(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function saveFrame() {
    const canvas = canvasRef.current;
    const current = mediaRef.current;
    if (!canvas || !current) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Could not save this frame.");
        return;
      }
      downloadBlob(blob, `${fileStem(current.name)}-drift.png`);
    }, "image/png");
  }

  function toggleRecording() {
    if (recording) {
      stopRecording();
      return;
    }
    const canvas = canvasRef.current;
    const current = mediaRef.current;
    if (!canvas || !current || typeof MediaRecorder === "undefined") return;

    const stream = canvas.captureStream(30);
    if (current.kind === "video" && videoRef.current) {
      const video = videoRef.current as HTMLVideoElement & { captureStream?: () => MediaStream };
      const captured = video.captureStream?.();
      captured?.getAudioTracks().forEach((track) => stream.addTrack(track));
    }

    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
        : new MediaRecorder(stream);
    } catch {
      setError("This browser could not start a recording.");
      return;
    }

    const chunks: Blob[] = [];
    const canvasTracks = [...stream.getVideoTracks()];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      canvasTracks.forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      downloadBlob(blob, `${fileStem(current.name)}-drift.webm`);
      setRecording(false);
      recorderRef.current = null;
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  }

  const api: StudioApi = {
    canvasRef,
    videoRef,
    phaseRef,
    media,
    loading,
    error,
    glError,
    dragging,
    recording,
    recordSupported,
    playing,
    currentTime,
    gradeA,
    gradeB,
    activeStops,
    mode,
    editTarget,
    shiftSpeed,
    animate,
    contrast,
    playbackRate,
    loop,
    muted,
    keepPitch,
    setMode,
    setEditTarget,
    setShiftSpeed,
    setAnimate,
    setContrast,
    setPlaybackRate,
    setLoop,
    setMuted,
    setKeepPitch,
    applyPreset,
    applyPassage,
    updateStop,
    addMidtone,
    removeMidtone,
    restartShift,
    openFilePicker: () => fileRef.current?.click(),
    loadStill,
    loadDemo: () => void loadDemo(),
    clearMedia,
    togglePlay,
    scrub,
    saveFrame,
    toggleRecording,
    onDragOver,
    onDragLeave,
    onDrop,
  };

  return (
    <StudioProvider value={api}>
      <div className="flex min-h-dvh flex-col bg-black text-white lg:h-dvh lg:overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-medium tracking-[0.22em]">DRIFT</span>
              <span className="hidden text-[11px] tracking-[0.16em] text-white/45 uppercase sm:inline">Gradient map</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveFrame} disabled={!media}>
              Save frame
            </Button>
            <Button variant="outline" size="sm" onClick={toggleRecording} disabled={!media || !recordSupported}>
              {recording ? (
                <>
                  <motion.span
                    className="inline-block size-2 bg-white"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  />
                  Stop
                </>
              ) : (
                "Record"
              )}
            </Button>
          </div>
        </header>
        <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
          <Stage />
          <Controls />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void loadFile(file);
          }}
        />
      </div>
    </StudioProvider>
  );
}

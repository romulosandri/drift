import { motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";

import { useStudio } from "@/components/studio-context.tsx";
import { Button } from "@/components/ui/button.tsx";
import { formatRate, formatTime } from "@/lib/color.ts";
import { cn } from "@/lib/utils.ts";

export function Stage() {
  const studio = useStudio();
  const reduce = useReducedMotion();
  const duration = studio.media?.duration ?? 0;
  const showEmpty = !studio.media && !studio.loading;

  return (
    <div
      className="relative h-[68vh] min-h-80 bg-black lg:h-auto lg:min-h-0"
      onDragOver={studio.onDragOver}
      onDragLeave={studio.onDragLeave}
      onDrop={studio.onDrop}
    >
      <div className="absolute inset-0">
        <canvas ref={studio.canvasRef} className="h-full w-full" />
      </div>

      <video
        ref={studio.videoRef}
        className="pointer-events-none fixed -left-[4000px] top-0 h-[180px] w-[320px] opacity-0"
        playsInline
        muted={studio.muted}
        loop={studio.loop}
        preload="auto"
      />

      {showEmpty ? (
        <motion.div
          className="absolute inset-0 flex items-center justify-center p-6"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={cn(
              "flex w-full max-w-md flex-col items-start gap-5 border border-dashed px-6 py-7",
              studio.dragging ? "border-white" : "border-white/25",
            )}
          >
            <div className="flex flex-col gap-2">
              <p className="text-sm tracking-[0.18em] text-white/50 uppercase">Drop an image or video</p>
              <h2 className="text-2xl font-medium tracking-tight text-white">Map luminance to a moving gradient.</h2>
              <p className="text-sm leading-relaxed text-white/60">
                Shadows take one end of the grade, highlights take the other. The map can crossfade into a second
                gradient, or travel until the two ends trade places.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={studio.openFilePicker}>Upload</Button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {studio.dragging && studio.media ? (
        <div className="pointer-events-none absolute inset-3 border border-dashed border-white" />
      ) : null}

      {studio.loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="font-mono text-xs tracking-[0.16em] text-white uppercase">Reading</p>
        </div>
      ) : null}

      {studio.glError ? (
        <div className="absolute inset-x-4 bottom-4 border border-white/20 bg-black px-4 py-3 text-sm text-white">
          {studio.glError}
        </div>
      ) : null}

      {studio.error ? (
        <div className="absolute inset-x-4 top-4 border border-white/20 bg-black px-4 py-3 text-sm text-white">
          {studio.error}
        </div>
      ) : null}

      {studio.media?.kind === "video" ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm sm:px-4">
          <Button variant="ghost" size="icon" onClick={studio.togglePlay} aria-label={studio.playing ? "Pause" : "Play"}>
            {studio.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <span className="w-24 shrink-0 font-mono text-[11px] text-white/70">
            {formatTime(studio.currentTime)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(studio.currentTime, duration || 0)}
            aria-label="Video position"
            onChange={(event) => studio.scrub(Number(event.target.value))}
            className="h-px w-full cursor-pointer accent-white"
          />
          <span className="w-12 shrink-0 text-right font-mono text-[11px] text-white/70">
            {formatRate(studio.playbackRate)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

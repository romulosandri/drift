import { motion, useReducedMotion } from "motion/react";

import { ColorStops } from "@/components/color-stops.tsx";
import { CycleMeter } from "@/components/cycle-meter.tsx";
import { useStudio } from "@/components/studio-context.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cycleSeconds, formatCycle, formatRate, sameStops, toCssGradient } from "@/lib/color.ts";
import { PASSAGES, PRESETS } from "@/lib/presets.ts";
import type { EditTarget, MotionMode } from "@/lib/types.ts";
import { cn } from "@/lib/utils.ts";

const MODES: { id: MotionMode; title: string; body: string }[] = [
  {
    id: "blend",
    title: "Between gradients",
    body: "Crossfade from one grade into another, then return.",
  },
  {
    id: "sweep",
    title: "Across the gradient",
    body: "Start with the grade as set, then travel until shadows and highlights trade places.",
  },
];

const SHIFT_PRESETS = [
  { label: "Slow", value: 0.12 },
  { label: "Medium", value: 0.38 },
  { label: "Fast", value: 0.72 },
];

const RATE_PRESETS = [0.5, 1, 1.5, 2];

function isEditTarget(value: string): value is EditTarget {
  return value === "a" || value === "b";
}

function modeDescription(mode: MotionMode): string {
  switch (mode) {
    case "blend":
      return "The picture starts on the first gradient and eases into the second.";
    case "sweep":
      return "The picture starts on this gradient and eases toward its opposite end.";
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}

export function Controls() {
  const studio = useStudio();
  const reduce = useReducedMotion();
  const videoReady = studio.media?.kind === "video";

  return (
    <aside className="border-t border-white/10 bg-black lg:overflow-y-auto lg:border-t-0 lg:border-l">
      <section className="flex flex-col gap-4 border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">Source</h2>
          {studio.media ? (
            <button type="button" onClick={studio.clearMedia} className="text-[11px] tracking-wide text-white/50 uppercase hover:text-white">
              Clear
            </button>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-white">{studio.media?.name ?? "Nothing loaded"}</p>
          <p className="mt-1 font-mono text-[11px] text-white/45">
            {studio.media
              ? `${studio.media.width} × ${studio.media.height} · ${studio.media.kind === "video" ? "video" : "still"}`
              : "JPG, PNG, WebP, MP4, WebM"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={studio.openFilePicker}>
            Upload
          </Button>
          <Button size="sm" variant="outline" onClick={studio.loadStill}>
            Studio still
          </Button>
          <Button size="sm" variant="outline" onClick={studio.loadDemo}>
            Demo reel
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-b border-white/10 px-5 py-5">
        <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">Grade</h2>
        {studio.mode === "blend" ? (
          <Tabs
            value={studio.editTarget}
            onValueChange={(value) => {
              if (isEditTarget(value)) studio.setEditTarget(value);
            }}
          >
            <TabsList>
              <TabsTrigger value="a">From</TabsTrigger>
              <TabsTrigger value="b">To</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <p className="text-xs text-white/50">This grade is the one that flips from end to end.</p>
        )}
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const selected = sameStops(preset.stops, studio.activeStops);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => studio.applyPreset(preset.id)}
                aria-pressed={selected}
                className="flex min-w-0 flex-col gap-1 text-left"
              >
                <span
                  className={cn("block h-8 border", selected ? "border-white" : "border-white/20")}
                  style={{ backgroundImage: toCssGradient(preset.stops) }}
                />
                <span className="truncate text-[10px] tracking-wide text-white/65">{preset.name}</span>
              </button>
            );
          })}
        </div>
        <ColorStops
          stops={studio.activeStops}
          onChange={studio.updateStop}
          onAddMidtone={studio.addMidtone}
          onRemoveMidtone={studio.removeMidtone}
        />
        <div className="h-8 border border-white/15" style={{ backgroundImage: toCssGradient(studio.activeStops) }} />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="contrast">Contrast</Label>
          <span className="font-mono text-[11px] text-white/70">{studio.contrast.toFixed(2)}</span>
        </div>
        <Slider
          id="contrast"
          aria-label="Contrast"
          min={0.5}
          max={2.2}
          step={0.01}
          value={[studio.contrast]}
          onValueChange={([value]) => {
            if (value !== undefined) studio.setContrast(value);
          }}
        />
        <p className="text-xs leading-relaxed text-white/45">
          Contrast separates shadows from highlights before they pick up color.
        </p>
      </section>

      <section className="flex flex-col gap-4 border-b border-white/10 px-5 py-5">
        <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">Motion</h2>
        <div role="radiogroup" aria-label="Gradient motion" className="grid gap-2">
          {MODES.map((mode, index) => {
            const selected = studio.mode === mode.id;
            return (
              <motion.button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => studio.setMode(mode.id)}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.04 }}
                className={cn(
                  "border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  selected ? "border-white bg-white text-black" : "border-white/15 text-white hover:border-white/40",
                )}
              >
                <span className="block text-sm font-medium">{mode.title}</span>
                <span className={cn("mt-1 block text-xs leading-relaxed", selected ? "text-black/70" : "text-white/55")}>
                  {mode.body}
                </span>
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-white/50">{modeDescription(studio.mode)}</p>
        {studio.mode === "blend" ? (
          <div className="flex flex-wrap gap-2">
            {PASSAGES.map((passage) => (
              <button
                key={passage.id}
                type="button"
                onClick={() => studio.applyPassage(passage.from, passage.to)}
                className="border border-white/20 px-2 py-1 text-[11px] text-white/75 hover:border-white"
              >
                {passage.name}
              </button>
            ))}
          </div>
        ) : null}
        <CycleMeter phaseRef={studio.phaseRef} mode={studio.mode} />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="shift-speed">Shift speed</Label>
          <span className="font-mono text-[11px] text-white/70">{formatCycle(cycleSeconds(studio.shiftSpeed))}</span>
        </div>
        <Slider
          id="shift-speed"
          aria-label="Gradient shift speed"
          min={0}
          max={1}
          step={0.01}
          value={[studio.shiftSpeed]}
          onValueChange={([value]) => {
            if (value !== undefined) studio.setShiftSpeed(value);
          }}
        />
        <div className="flex flex-wrap gap-2">
          {SHIFT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => studio.setShiftSpeed(preset.value)}
              className={cn(
                "border px-2 py-1 text-[11px] tracking-wide uppercase",
                Math.abs(studio.shiftSpeed - preset.value) < 0.001
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white/70 hover:border-white/50",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="animate-shift">Animate shift</Label>
          <Switch id="animate-shift" checked={studio.animate} onCheckedChange={studio.setAnimate} />
        </div>
        <Button variant="ghost" size="sm" className="self-start px-0" onClick={studio.restartShift}>
          Restart from the first gradient
        </Button>
      </section>

      <section className={cn("flex flex-col gap-4 border-b border-white/10 px-5 py-5", videoReady ? "" : "opacity-70")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">Playback</h2>
          <span className="font-mono text-sm text-white">{formatRate(studio.playbackRate)}</span>
        </div>
        <p className="text-xs leading-relaxed text-white/50">
          {videoReady
            ? "Changes how fast the video itself plays. The gradient shift keeps its own speed."
            : "Playback speed applies once a video is loaded. Stills only move the gradient."}
        </p>
        <Slider
          aria-label="Video playback speed"
          min={0.25}
          max={2}
          step={0.05}
          disabled={!videoReady}
          value={[studio.playbackRate]}
          onValueChange={([value]) => {
            if (value !== undefined) studio.setPlaybackRate(value);
          }}
        />
        <div className="flex flex-wrap gap-2">
          {RATE_PRESETS.map((rate) => (
            <button
              key={rate}
              type="button"
              disabled={!videoReady}
              onClick={() => studio.setPlaybackRate(rate)}
              className={cn(
                "border px-2 py-1 font-mono text-[11px] disabled:opacity-40",
                Math.abs(studio.playbackRate - rate) < 0.001
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white/70 hover:border-white/50",
              )}
            >
              {formatRate(rate)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="loop-video">Loop</Label>
          <Switch id="loop-video" checked={studio.loop} disabled={!videoReady} onCheckedChange={studio.setLoop} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="mute-video">Sound</Label>
          <Switch
            id="mute-video"
            checked={!studio.muted}
            disabled={!videoReady}
            onCheckedChange={(checked) => studio.setMuted(!checked)}
            aria-label="Sound"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="keep-pitch">Keep pitch</Label>
          <Switch id="keep-pitch" checked={studio.keepPitch} disabled={!videoReady} onCheckedChange={studio.setKeepPitch} />
        </div>
      </section>

    </aside>
  );
}

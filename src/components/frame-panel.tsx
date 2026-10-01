import { useEffect, useRef, useState } from "react";

import { useStudio } from "@/components/studio-context.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { ASPECT_CHOICES, FIT_MODES, aspectLabel } from "@/lib/frame.ts";
import type { AspectChoice, FitMode } from "@/lib/types.ts";
import { cn } from "@/lib/utils.ts";

function isAspectChoice(value: string): value is AspectChoice {
  return ASPECT_CHOICES.some((item) => item.id === value);
}

function isFitMode(value: string): value is FitMode {
  return value === "fill" || value === "fit" || value === "contain";
}

export function FramePanel() {
  const studio = useStudio();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const imageLoaded = studio.media?.kind === "image";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = imageLoaded ? `${aspectLabel(studio.aspect)} · ${studio.imageDuration}s` : aspectLabel(studio.aspect);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Aspect ratio"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-30 w-72 border border-white/15 bg-black p-4"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">Aspect ratio</h2>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_CHOICES.map((choice) => {
                  const selected = studio.aspect === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        if (isAspectChoice(choice.id)) studio.setAspect(choice.id);
                      }}
                      className={cn(
                        "border px-2 py-1.5 text-[11px] tracking-wide",
                        selected ? "border-white bg-white text-black" : "border-white/20 text-white/75 hover:border-white/50",
                      )}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">Frame</h2>
              <div className="grid gap-2">
                {FIT_MODES.map((mode) => {
                  const selected = studio.fit === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        if (isFitMode(mode.id)) studio.setFit(mode.id);
                      }}
                      className={cn(
                        "border px-3 py-2 text-left",
                        selected ? "border-white bg-white text-black" : "border-white/15 text-white hover:border-white/40",
                      )}
                    >
                      <span className="block text-sm font-medium">{mode.label}</span>
                      <span className={cn("mt-0.5 block text-xs leading-relaxed", selected ? "text-black/70" : "text-white/55")}>
                        {mode.body}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {imageLoaded ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="image-duration">Duration</Label>
                  <span className="font-mono text-[11px] text-white/70">{studio.imageDuration}s</span>
                </div>
                <Slider
                  id="image-duration"
                  aria-label="Image export duration"
                  min={1}
                  max={30}
                  step={1}
                  value={[studio.imageDuration]}
                  onValueChange={([value]) => {
                    if (value !== undefined) studio.setImageDuration(value);
                  }}
                />
                <p className="text-xs leading-relaxed text-white/45">
                  A still becomes a video of this length. The grade keeps moving through it.
                </p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-white/45">
                A video exports for its own length at the playback speed you set.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

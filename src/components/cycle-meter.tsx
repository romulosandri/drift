import { useEffect, useRef, type RefObject } from "react";

import type { MotionMode } from "@/lib/types.ts";

type CycleMeterProps = {
  phaseRef: RefObject<number>;
  mode: MotionMode;
};

function endLabels(mode: MotionMode): [string, string] {
  switch (mode) {
    case "blend":
      return ["From", "To"];
    case "sweep":
      return ["As set", "Flipped"];
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}

export function CycleMeter({ phaseRef, mode }: CycleMeterProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [start, end] = endLabels(mode);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const bar = barRef.current;
      if (bar) bar.style.transform = `scaleX(${phaseRef.current})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phaseRef]);

  return (
    <div className="flex flex-col gap-2">
      <div className="h-px w-full bg-white/20">
        <div ref={barRef} className="h-px w-full origin-left bg-white" />
      </div>
      <div className="flex justify-between font-mono text-[10px] tracking-wide text-white/45 uppercase">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </div>
  );
}

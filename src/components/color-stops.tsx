import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { normalizeHex } from "@/lib/color.ts";
import type { GradientStop } from "@/lib/types.ts";

type ColorStopsProps = {
  stops: GradientStop[];
  onChange: (index: number, color: string) => void;
  onAddMidtone: () => void;
  onRemoveMidtone: () => void;
};

function stopLabel(index: number, count: number): string {
  if (index === 0) return "Shadow";
  if (index === count - 1) return "Highlight";
  return "Midtone";
}

function StopRow({
  label,
  color,
  onCommit,
}: {
  label: string;
  color: string;
  onCommit: (color: string) => void;
}) {
  const [draft, setDraft] = useState(color);
  const [syncedColor, setSyncedColor] = useState(color);
  if (color !== syncedColor) {
    setSyncedColor(color);
    setDraft(color);
  }

  return (
    <div className="flex items-center gap-3 border border-white/15 px-3 py-2">
      <label className="relative size-7 shrink-0 cursor-pointer">
        <span className="sr-only">{label} color</span>
        <input
          type="color"
          value={color}
          aria-label={`${label} color`}
          onChange={(event) => onCommit(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer"
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] tracking-[0.14em] text-white/45 uppercase">{label}</div>
        <input
          value={draft}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const normalized = normalizeHex(next);
            if (normalized) onCommit(normalized);
          }}
          onBlur={() => {
            const normalized = normalizeHex(draft);
            if (!normalized) setDraft(color);
          }}
          className="w-full bg-transparent font-mono text-xs text-white uppercase outline-none"
        />
      </div>
    </div>
  );
}

export function ColorStops({ stops, onChange, onAddMidtone, onRemoveMidtone }: ColorStopsProps) {
  return (
    <div className="flex flex-col gap-2">
      {stops.map((stop, index) => (
        <StopRow
          key={`${stop.at}-${index}`}
          label={stopLabel(index, stops.length)}
          color={stop.color}
          onCommit={(color) => onChange(index, color)}
        />
      ))}
      <div className="flex gap-2">
        {stops.length < 3 ? (
          <Button variant="ghost" size="sm" onClick={onAddMidtone}>
            Add midtone
          </Button>
        ) : null}
        {stops.length > 2 ? (
          <Button variant="ghost" size="sm" onClick={onRemoveMidtone}>
            Remove midtone
          </Button>
        ) : null}
      </div>
    </div>
  );
}

import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils.ts";

function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase", className)}
      {...props}
    />
  );
}

export { Label };

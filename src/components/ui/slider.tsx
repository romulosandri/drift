import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils.ts";

function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-px w-full grow bg-white/25">
        <SliderPrimitive.Range className="absolute h-full bg-white" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3 border border-white bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" />
    </SliderPrimitive.Root>
  );
}

export { Slider };

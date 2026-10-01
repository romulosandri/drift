import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils.ts";

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center border border-white/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-white data-[state=unchecked]:bg-transparent",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3.5 translate-x-0.5 bg-white transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-black" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

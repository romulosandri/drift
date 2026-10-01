import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils.ts";

function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-3", className)} {...props} />;
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("grid grid-cols-2 border border-white/20", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "h-8 text-xs tracking-wide text-white/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white data-[state=active]:bg-white data-[state=active]:text-black",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger };

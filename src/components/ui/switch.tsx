"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      // Taller, more confident toggle (h-6) at default size so it feels
      // physical when tapped. Spring curve on the thumb slide. Gold
      // rail when on; neutral rail when off with a subtle warm fill.
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs outline-none",
        "transition-[background-color,border-color,box-shadow] duration-[var(--duration-small)] [transition-timing-function:var(--ease-spring)]",
        "data-[size=default]:h-6 data-[size=default]:w-11",
        "data-[size=sm]:h-4 data-[size=sm]:w-7",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong/40 dark:data-[state=unchecked]:bg-input/80",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // Thumb: pure white disc with soft shadow; translates on a
        // spring so the motion reads as tactile, not linear.
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm ring-0",
          "transition-transform duration-[var(--duration-small)] [transition-timing-function:var(--ease-spring)]",
          "group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3",
          "group-data-[size=default]/switch:data-[state=checked]:translate-x-[calc(100%+2px)]",
          "group-data-[size=sm]/switch:data-[state=checked]:translate-x-[calc(100%-2px)]",
          "data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      // Softer hairline border at rest, warmer hover tint, spring-tactile
      // scale on press. Checked state goes full gold via `data-[state=checked]`.
      className={cn(
        "peer border-border-strong/60 bg-surface/50 size-[18px] shrink-0 rounded-md border shadow-xs outline-none",
        "transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-tactile)] [transition-timing-function:var(--ease-spring)]",
        "hover:border-border-strong active:scale-95",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

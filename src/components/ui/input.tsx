import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input primitive. Premium-redesign chrome:
 *   - Hairline border at rest, subtle warm fill lifting it from the page.
 *   - Hover darkens the border (a stronger cue than just the focus ring).
 *   - Focus-visible: gold ring (brand-primary) at 3px, bg snaps to pure
 *     `background` so the input feels lit up rather than ambient.
 *   - `aria-invalid` swaps ring + border to destructive.
 *   - `h-10` (was h-9) — meets the comfortable-form 40px target.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input text-foreground placeholder:text-foreground-subtle bg-surface/60 selection:bg-primary selection:text-primary-foreground file:text-foreground",
        "h-10 w-full min-w-0 rounded-lg border px-3 py-1 text-base shadow-xs outline-none md:text-sm",
        "transition-[color,background-color,border-color,box-shadow] duration-[var(--duration-micro)] [transition-timing-function:var(--ease-standard)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "hover:border-border-strong/60 dark:bg-input/30",
        "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25 dark:aria-invalid:ring-destructive/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

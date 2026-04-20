import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea primitive. Same premium chrome as Input (hairline border,
 * subtle warm fill, gold focus ring) with `field-sizing-content` so it
 * grows with content and `min-h-20` so it starts at two lines' worth of
 * space rather than one.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input text-foreground placeholder:text-foreground-subtle bg-surface/60",
        "flex field-sizing-content min-h-20 w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none md:text-sm",
        "transition-[color,background-color,border-color,box-shadow] duration-[var(--duration-micro)] [transition-timing-function:var(--ease-standard)]",
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

export { Textarea };

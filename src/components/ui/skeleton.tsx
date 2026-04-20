import { cn } from "@/lib/utils";

/**
 * Skeleton — placeholder rectangle with a shimmer gradient.
 *
 * Uses a linear-gradient "sheen" sweeping left-to-right via the
 * `sweep` keyframes defined in globals.css. Falls back to a gentle
 * opacity pulse if `prefers-reduced-motion` is set (the base layer's
 * global `animation-duration: 0.01ms` reset collapses the sweep).
 *
 * Consumers stack multiple skeletons via `<TableSkeleton>` /
 * `<FormSkeleton>` / `<CardSkeleton>` / etc. in `skeleton-kit.tsx`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-surface relative overflow-hidden rounded-md",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:via-foreground/10 before:bg-gradient-to-r before:from-transparent before:to-transparent",
        "before:animate-[sweep_1.6s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

import * as React from "react";
import { CircleHelp, FilterX, OctagonX } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * EmptyState — prompt.md §2B-D.7 + CLAUDE.md §5.
 *
 * Every route that can render an empty result set composes one of the three
 * variants. Inline "No data found" strings are forbidden (prompt.md rule 8
 * error taxonomy). Callers place CTAs / reset-filter buttons in the `action`
 * slot; copy goes in `description`.
 */

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center gap-5 px-6 py-12 text-center",
  {
    variants: {
      variant: {
        // Solid card surface for "expected" empty states (no history yet).
        "first-use": "border-border-subtle bg-card shadow-xs",
        // Filtered-out uses surface tier to signal "you have data, it's
        // just hidden behind your filters" — dashed border indicates
        // the temporary nature.
        "filtered-out": "border-dashed border-border bg-surface/50",
        // Error uses tonal soft-bg + ring-matched border for at-a-glance
        // severity.
        error: "border-status-danger-border bg-status-danger-soft/50",
      },
      density: {
        default: "",
        compact: "gap-3 py-8",
      },
      frame: {
        // Standalone — paints its own card chrome (border + radius).
        // Default for top-level usage on a route page.
        card: "rounded-xl border",
        // Naked — no border, no rounded corners. Use when composing
        // inside another framed surface (e.g., `<FilterableDataTable>`)
        // so the parent's frame isn't doubled with an inner card.
        none: "border-0",
      },
    },
    defaultVariants: {
      variant: "first-use",
      density: "default",
      frame: "card",
    },
  },
);

const ICONS: Record<EmptyStateVariant, React.ComponentType<{ className?: string }>> = {
  "first-use": CircleHelp,
  "filtered-out": FilterX,
  error: OctagonX,
};

const ICON_TONE: Record<EmptyStateVariant, string> = {
  "first-use": "text-foreground-subtle",
  "filtered-out": "text-foreground-muted",
  error: "text-status-danger-foreground",
};

type EmptyStateVariant = NonNullable<VariantProps<typeof emptyStateVariants>["variant"]>;

type EmptyStateOwnProps = Readonly<{
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  "data-testid"?: string;
}>;

export type EmptyStateProps = EmptyStateOwnProps &
  VariantProps<typeof emptyStateVariants> &
  Omit<React.ComponentProps<"div">, keyof EmptyStateOwnProps>;

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = "first-use",
  density,
  frame,
  className,
  "data-testid": testId,
  ...props
}: EmptyStateProps) {
  const resolvedVariant = (variant ?? "first-use") as EmptyStateVariant;
  const Icon = ICONS[resolvedVariant];
  return (
    <div
      role={resolvedVariant === "error" ? "alert" : "status"}
      aria-live={resolvedVariant === "error" ? "assertive" : "polite"}
      data-slot="empty-state"
      data-variant={resolvedVariant}
      data-frame={frame ?? "card"}
      data-testid={testId}
      className={cn(emptyStateVariants({ variant, density, frame }), className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "bg-background ring-border-subtle animate-in zoom-in-95 flex size-16 items-center justify-center rounded-2xl shadow-xs ring-1 duration-500",
          ICON_TONE[resolvedVariant],
        )}
      >
        {icon ?? <Icon className="size-8" />}
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h3 className="text-foreground text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="text-foreground-muted text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export { emptyStateVariants };

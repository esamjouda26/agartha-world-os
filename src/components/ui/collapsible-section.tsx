"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * CollapsibleSection — header + chevron + collapsible content.
 *
 * Radix-backed (`@radix-ui/react-collapsible`) so a11y is correct
 * (aria-expanded, aria-controls, keyboard activation). Use for "More
 * filters" panels, device detail drill-downs, maintenance history, any
 * optional content that should collapse by default on dense pages.
 *
 * Controlled and uncontrolled modes are both supported — pass
 * `open` + `onOpenChange` for controlled, nothing for uncontrolled.
 */

export type CollapsibleSectionProps = Readonly<{
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional leading icon for the header. */
  icon?: React.ReactNode;
  /** Optional right-aligned action slot inside the trigger row. */
  action?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Visual chrome. `card` surrounds the section in a bordered card; `flush` is chromeless. */
  variant?: "card" | "flush";
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
  children: React.ReactNode;
}>;

export function CollapsibleSection({
  title,
  description,
  icon,
  action,
  defaultOpen = false,
  open,
  onOpenChange,
  variant = "card",
  disabled = false,
  className,
  "data-testid": testId,
  children,
}: CollapsibleSectionProps) {
  return (
    <CollapsiblePrimitive.Root
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange !== undefined ? { onOpenChange } : {})}
      defaultOpen={defaultOpen}
      disabled={disabled}
      data-slot="collapsible-section"
      data-variant={variant}
      data-testid={testId}
      className={cn(
        "group/collapsible flex flex-col",
        variant === "card"
          ? "border-border-subtle bg-card overflow-hidden rounded-xl border shadow-xs"
          : null,
        className,
      )}
    >
      <CollapsiblePrimitive.Trigger
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left",
          variant === "card" ? "px-4 py-3" : "py-2",
          "text-foreground hover:text-brand-primary",
          "transition-colors duration-[var(--duration-micro)] [transition-timing-function:var(--ease-standard)]",
          "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span aria-hidden className="text-foreground-subtle shrink-0">
              {icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{title}</span>
            {description ? (
              <span className="text-foreground-muted text-xs">{description}</span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {action ? <span onClick={(e) => e.stopPropagation()}>{action}</span> : null}
          <ChevronDown
            aria-hidden
            className="text-foreground-subtle size-4 transition-transform duration-[var(--duration-small)] group-data-[state=open]/collapsible:rotate-180"
          />
        </span>
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content
        // Radix exposes --radix-collapsible-content-height; use it to
        // animate height for a buttery reveal.
        className={cn(
          "overflow-hidden",
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        )}
      >
        <div
          className={cn(variant === "card" ? "border-border-subtle border-t px-4 py-3" : "pt-2")}
        >
          {children}
        </div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

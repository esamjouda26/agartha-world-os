"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";

import { motion, usePrefersReducedMotion, MOTION_EASINGS } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * StatusTabBar — segmented-pill primary navigation surface.
 *
 * Renders a prominent, dashboard-grade tab control:
 *   - Pill-shaped container with hairline border + frost backdrop.
 *   - Active tab gets a gold surface that slides between positions via
 *     framer-motion's `layoutId` (shared layout animation) on a spring
 *     curve. On reduced-motion the spring collapses to 0 duration.
 *   - Arrow-key navigation per ARIA APG "Tabs" pattern.
 *   - URL-backed state via nuqs so deep-links hydrate correctly.
 *
 * The content panels themselves are NOT owned here; callers render
 * `<StatusTabBar />` above a conditional panel so the RSC stays in
 * charge of data fetching.
 */

export type StatusTabDefinition = Readonly<{
  value: string;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
  /** Optional dot color on the tab trigger. */
  tone?: "success" | "warning" | "danger" | "info" | "neutral" | "accent";
}>;

export type StatusTabBarProps = Readonly<{
  tabs: readonly StatusTabDefinition[];
  paramKey?: string;
  defaultValue?: string;
  /** Accessible label for the tablist, required by ARIA 1.2. */
  ariaLabel: string;
  /**
   * When the caller renders tabpanel elements keyed by tab value, pass
   * a prefix so each `<button role="tab">` can wire `aria-controls` to
   * the matching `<div role="tabpanel">`. Omit when no tabpanel exists
   * (primitive acting as a filter bar).
   */
  panelIdPrefix?: string;
  /**
   * Visual density. Defaults to `comfortable` (h-12 / h-10 buttons).
   * `compact` shrinks to h-10 / h-8 for admin sub-filters.
   */
  size?: "compact" | "comfortable";
  /**
   * Controls how the bar fills horizontal space.
   *   `stretch`  — each tab `flex-1` (mobile default; fills the row)
   *   `natural`  — tabs size to their content (desktop default)
   */
  fill?: "stretch" | "natural";
  className?: string;
  "data-testid"?: string;
  onValueChange?: (value: string) => void;
}>;

const TONE_DOT_BG: Record<NonNullable<StatusTabDefinition["tone"]>, string> = {
  success: "bg-status-success-solid",
  warning: "bg-status-warning-solid",
  danger: "bg-status-danger-solid",
  info: "bg-status-info-solid",
  neutral: "bg-status-neutral-solid",
  accent: "bg-status-accent-solid",
};

export function StatusTabBar({
  tabs,
  paramKey = "tab",
  defaultValue,
  ariaLabel,
  panelIdPrefix,
  size = "comfortable",
  fill = "stretch",
  className,
  "data-testid": testId,
  onValueChange,
}: StatusTabBarProps) {
  const fallback = defaultValue ?? tabs[0]?.value ?? "";
  const [active, setActive] = useQueryState(
    paramKey,
    parseAsString.withDefault(fallback).withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const reduced = usePrefersReducedMotion();

  const currentValue = tabs.some((tab) => tab.value === active) ? active : fallback;
  const triggersRef = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const enabledIndexes = tabs
      .map((tab, i) => (tab.disabled ? -1 : i))
      .filter((i): i is number => i >= 0);
    const pos = enabledIndexes.indexOf(index);
    if (pos === -1) return;

    let nextPos: number | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextPos = (pos + 1) % enabledIndexes.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextPos = (pos - 1 + enabledIndexes.length) % enabledIndexes.length;
        break;
      case "Home":
        nextPos = 0;
        break;
      case "End":
        nextPos = enabledIndexes.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextIndex = enabledIndexes[nextPos!]!;
    const nextTab = tabs[nextIndex]!;
    triggersRef.current[nextIndex]?.focus();
    void setActive(nextTab.value);
    onValueChange?.(nextTab.value);
  };

  const containerHeight = size === "compact" ? "h-10" : "h-12";
  const buttonHeight = size === "compact" ? "h-8" : "h-10";
  const indicatorLayoutId = `status-tab-indicator-${paramKey}`;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-slot="status-tab-bar"
      data-testid={testId}
      className={cn(
        // Container: frosted pill with hairline border and subtle shadow. At
        // light mode a warm surface tint; at dark mode an atmospheric tint.
        // The relative positioning is required for the layoutId indicator.
        "border-border bg-surface/80 relative flex items-center gap-1 overflow-x-auto rounded-full border p-1 shadow-xs backdrop-blur-sm",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        containerHeight,
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.value === currentValue;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              triggersRef.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${paramKey}-${tab.value}`}
            aria-controls={panelIdPrefix ? `${panelIdPrefix}-${tab.value}` : undefined}
            aria-selected={isSelected}
            aria-disabled={tab.disabled || undefined}
            tabIndex={isSelected ? 0 : -1}
            disabled={tab.disabled}
            data-state={isSelected ? "active" : "inactive"}
            data-testid={testId ? `${testId}-${tab.value}` : undefined}
            onClick={() => {
              if (tab.disabled) return;
              void setActive(tab.value);
              onValueChange?.(tab.value);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              // Position relative so the absolute indicator lives inside the
              // active button's layout slot. `z-0` on button + `-z-10` on
              // indicator is unreliable across browsers; instead the text/icon
              // spans get `relative z-10` and the motion bg sits at the default.
              "group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium",
              "transition-colors duration-[var(--duration-micro)] [transition-timing-function:var(--ease-standard)]",
              "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              buttonHeight,
              fill === "stretch" ? "min-w-0 flex-1" : "min-w-max",
              isSelected
                ? "text-brand-primary-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {isSelected ? (
              <motion.span
                aria-hidden
                layoutId={indicatorLayoutId}
                className="bg-brand-primary absolute inset-0 rounded-full shadow-sm"
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                        mass: 0.9,
                      }
                }
              />
            ) : null}

            <span className="relative z-10 inline-flex items-center gap-2">
              {tab.tone ? (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full transition-colors",
                    TONE_DOT_BG[tab.tone],
                    // When the tab is active, the dot loses visual weight
                    // because the filled pill already signals state; tint it
                    // toward the active-fg so it reads as an accent, not noise.
                    isSelected && "bg-brand-primary-foreground/70",
                  )}
                />
              ) : null}
              <span className="truncate">{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span
                  aria-label={`(${tab.count} items)`}
                  className={cn(
                    "inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums transition-colors",
                    isSelected
                      ? "bg-brand-primary-foreground/20 text-brand-primary-foreground"
                      : "bg-border-subtle text-foreground-subtle",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Re-export motion easings for callers that want to choreograph a
// custom transition alongside the indicator spring.
export { MOTION_EASINGS };

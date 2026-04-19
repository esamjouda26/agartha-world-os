"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";

import { cn } from "@/lib/utils";

/**
 * StatusTabBar — prompt.md §2B-D.3.
 *
 * URL-backed tab bar (nuqs) with counts and arrow-key navigation per
 * APG "Tabs" pattern (ARIA 1.2, §3.22). Callers pass:
 *   - `tabs`: list of tab definitions with `value` / `label` / optional
 *     `count` / `tone`.
 *   - `paramKey`: nuqs key (defaults to "tab"). Deep-links hydrate the
 *     initial selection.
 *
 * The content panels themselves are NOT owned here — this primitive is the
 * bar only. Feature code renders `<StatusTabBar …>` above a conditional panel
 * so the server component stays in charge of data fetching.
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
   * Optional — when the caller renders tabpanel elements keyed by tab value,
   * pass a prefix so each `<button role="tab">` can wire `aria-controls` to
   * the matching `<div role="tabpanel" id={`${prefix}-${value}`}>`. Omit the
   * prop when no tabpanel exists and the primitive is acting as a filter bar
   * (wiring aria-controls to a nonexistent element is an axe failure).
   */
  panelIdPrefix?: string;
  className?: string;
  "data-testid"?: string;
  onValueChange?: (value: string) => void;
}>;

const toneDot: Record<NonNullable<StatusTabDefinition["tone"]>, string> = {
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
  className,
  "data-testid": testId,
  onValueChange,
}: StatusTabBarProps) {
  const fallback = defaultValue ?? tabs[0]?.value ?? "";
  const [active, setActive] = useQueryState(
    paramKey,
    parseAsString.withDefault(fallback).withOptions({ clearOnDefault: true, history: "replace" }),
  );

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

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-slot="status-tab-bar"
      data-testid={testId}
      className={cn(
        "border-border-subtle bg-surface flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-lg border p-1",
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
              "focus-visible:outline-ring inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "bg-background text-foreground shadow-xs"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {tab.tone ? (
              <span aria-hidden className={cn("size-1.5 rounded-full", toneDot[tab.tone])} />
            ) : null}
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span
                aria-label={`(${tab.count} items)`}
                className={cn(
                  "inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs tabular-nums",
                  isSelected
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "bg-border-subtle text-foreground-subtle",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

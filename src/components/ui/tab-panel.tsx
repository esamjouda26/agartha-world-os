"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * TabPanel — tabs shell with a declarative `tabs` array + content map.
 *
 * Standard detail-page tab strip: "Profile | Leave Policy | Equipment"
 * on staff, "Overview | Modifiers | Pricing" on materials, etc. Much
 * less boilerplate than composing `<Tabs>/<TabsList>/<TabsTrigger>` +
 * a parallel `<TabsContent>` block for each tab.
 *
 * Controlled and uncontrolled modes:
 *   - Uncontrolled: omit `value`; component holds its own active-tab state.
 *   - Controlled:  pass `value` + `onValueChange` (for URL-synced tabs
 *     bound via `nuqs`).
 *
 * Each tab may expose a badge/count via `count` and a disabled state.
 */

export type TabPanelItem = Readonly<{
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  /** Numeric count rendered as a small pill next to the label. */
  count?: number;
  disabled?: boolean;
  "data-testid"?: string;
}>;

export type TabPanelProps = Readonly<{
  tabs: readonly TabPanelItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "default" | "line";
  className?: string;
  listClassName?: string;
  contentClassName?: string;
  "data-testid"?: string;
}>;

export function TabPanel({
  tabs,
  value,
  defaultValue,
  onValueChange,
  variant = "default",
  className,
  listClassName,
  contentClassName,
  "data-testid": testId,
}: TabPanelProps) {
  const initial = defaultValue ?? tabs[0]?.id;
  if (!initial) return null;

  return (
    <Tabs
      {...(value !== undefined ? { value } : { defaultValue: initial })}
      {...(onValueChange !== undefined ? { onValueChange } : {})}
      data-testid={testId}
      className={cn("flex w-full flex-col gap-4", className)}
    >
      <TabsList variant={variant} className={cn("w-full sm:w-fit", listClassName)}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            data-testid={tab["data-testid"] ?? (testId ? `${testId}-tab-${tab.id}` : undefined)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                aria-label={`${tab.count} items`}
                className="border-border-subtle bg-background text-foreground-muted inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-medium tabular-nums"
              >
                {tab.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className={cn("flex flex-col gap-4", contentClassName)}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

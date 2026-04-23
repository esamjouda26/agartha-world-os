"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * MasterDetailShell — two-pane layout: narrow list on the left, detail
 * on the right.
 *
 * Used for POS Point detail with tabbed sub-views, BOM detail, Menu
 * editor — any flow where the user scans a list AND edits one item at
 * a time without losing the list context.
 *
 * Below `md` the shell collapses: active pane swaps based on
 * `selectedId`. `null` selection shows the list; non-null shows the
 * detail with a back control (caller renders). Desktop keeps both
 * panes visible at all times.
 *
 * Pattern C: caller owns `selectedId` (usually via a URL param through
 * `nuqs`) and passes it in. The shell only drives responsive layout.
 */

export type MasterDetailShellProps = Readonly<{
  /** Left-pane content — typically a list or tree. */
  list: React.ReactNode;
  /** Right-pane content — detail view for the selected item. */
  detail: React.ReactNode;
  /** Non-null when an item is selected; drives mobile layout. */
  selectedId?: string | null;
  /** Optional fixed width for the list pane on md+. Defaults to 18rem. */
  listWidth?: string;
  /** Max height on desktop so each pane scrolls independently. */
  paneMaxHeight?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function MasterDetailShell({
  list,
  detail,
  selectedId = null,
  listWidth = "18rem",
  paneMaxHeight = "calc(100dvh - 12rem)",
  className,
  "data-testid": testId,
}: MasterDetailShellProps) {
  const showDetailOnMobile = selectedId !== null;

  return (
    <div
      data-slot="master-detail-shell"
      data-selected={showDetailOnMobile || undefined}
      data-testid={testId}
      className={cn("flex w-full flex-col md:grid md:gap-6", className)}
      style={{
        gridTemplateColumns: `minmax(0, ${listWidth}) minmax(0, 1fr)`,
      }}
    >
      <aside
        data-slot="master-detail-list"
        className={cn(
          "border-border-subtle bg-card md:sticky md:top-20 md:h-fit md:overflow-y-auto md:rounded-xl md:border md:shadow-xs",
          showDetailOnMobile ? "hidden md:block" : "block",
        )}
        style={{ maxHeight: paneMaxHeight }}
      >
        {list}
      </aside>
      <main
        data-slot="master-detail-detail"
        className={cn(
          "flex min-w-0 flex-col gap-4",
          showDetailOnMobile ? "block" : "hidden md:flex",
        )}
      >
        {detail}
      </main>
    </div>
  );
}

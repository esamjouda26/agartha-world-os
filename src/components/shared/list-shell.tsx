import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ListShell — card-list layout for mobile and for pages that never want
 * a tabular presentation.
 *
 * Used:
 *   - As the `md:hidden` fallback under `<FilterableDataTable>`
 *     (`frontend_spec.md:25` mandates the responsive card collapse).
 *   - As the primary body of crew-facing lists where a table would be
 *     unreadable on a 375px viewport (incident log, announcements,
 *     shift roster, attendance punches).
 *
 * Pattern C: caller renders rows (as `<li>` or card components) inside
 * the list. This shell owns the empty/loading/error state slots and the
 * semantic `<ul>` wrapper.
 */

export type ListShellProps = Readonly<{
  /** Rendered row nodes — typically `<li>` elements or `<AnnouncementCard>`. */
  children?: React.ReactNode;
  /** Slot shown when `children` is empty. */
  empty?: React.ReactNode;
  /** Slot shown when `isLoading` is true. Typically a skeleton list. */
  isLoading?: boolean;
  loading?: React.ReactNode;
  /** Slot shown when `error` is provided. */
  error?: React.ReactNode;
  /**
   * When `children` is a count rather than nodes, the shell uses it to
   * decide between `empty` and body rendering. For raw React nodes, pass
   * `itemCount` when the shell can't infer emptiness (fragments, maps).
   */
  itemCount?: number;
  /** Gap token between list items. */
  gap?: "xs" | "sm" | "md";
  /** Render as an unordered list (`<ul>`) or a generic container (`<div>`). */
  as?: "ul" | "div";
  className?: string;
  "data-testid"?: string;
}>;

const GAP: Record<NonNullable<ListShellProps["gap"]>, string> = {
  xs: "gap-1.5",
  sm: "gap-2",
  md: "gap-3",
};

export function ListShell({
  children,
  empty,
  isLoading = false,
  loading,
  error,
  itemCount,
  gap = "sm",
  as = "ul",
  className,
  "data-testid": testId,
}: ListShellProps) {
  if (error) {
    return (
      <div data-slot="list-shell" data-state="error" data-testid={testId}>
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-slot="list-shell" data-state="loading" data-testid={testId}>
        {loading}
      </div>
    );
  }

  const effectiveCount =
    itemCount ??
    (Array.isArray(children) ? children.filter((child) => child != null).length : children ? 1 : 0);

  if (effectiveCount === 0 && empty) {
    return (
      <div data-slot="list-shell" data-state="empty" data-testid={testId}>
        {empty}
      </div>
    );
  }

  const Tag = as;
  return (
    <Tag
      data-slot="list-shell"
      data-testid={testId}
      className={cn("flex flex-col", GAP[gap], className)}
    >
      {children}
    </Tag>
  );
}

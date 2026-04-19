import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PageHeader — prompt.md §2B-D.5. Every feature route renders its `<h1>`
 * through this primitive; raw `<h1>` tags outside marketing pages are
 * forbidden (prompt.md rule 8 primitives-only policy + CLAUDE.md §5 semantic
 * HTML contract).
 */

export type PageHeaderProps = Readonly<{
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Fully-composed `<Breadcrumb>` tree. */
  breadcrumbs?: React.ReactNode;
  /** Single primary CTA — right-aligned on wide viewports. */
  primaryAction?: React.ReactNode;
  /** Optional cluster of secondary actions rendered to the left of primary. */
  secondaryActions?: React.ReactNode;
  /** Meta slot for filters, segmented controls, status badges, timestamps. */
  metaSlot?: React.ReactNode;
  /** Visual density. "compact" drops bottom padding for dense admin layouts. */
  density?: "default" | "compact";
  /**
   * Heading level for the title. Feature routes MUST use the default `1`
   * (one h1 per page, CLAUDE.md §5). Non-primary surfaces such as dashboard
   * tiles or in-page demo sections should pass `2` to preserve document
   * heading order.
   */
  headingLevel?: 1 | 2;
  className?: string;
  "data-testid"?: string;
}>;

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  metaSlot,
  density = "default",
  headingLevel = 1,
  className,
  "data-testid": testId,
}: PageHeaderProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2";
  return (
    <header
      data-slot="page-header"
      data-testid={testId}
      data-density={density}
      className={cn(
        "border-border-subtle flex flex-col gap-4 border-b",
        density === "compact" ? "pb-3" : "pb-6",
        className,
      )}
    >
      {breadcrumbs ? <div className="text-foreground-subtle text-xs">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading
            className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl"
            data-slot="page-header-title"
          >
            {title}
          </Heading>
          {description ? (
            <p className="text-foreground-muted max-w-prose text-sm">{description}</p>
          ) : null}
        </div>
        {primaryAction || secondaryActions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
      {metaSlot ? <div className="flex flex-wrap items-center gap-3">{metaSlot}</div> : null}
    </header>
  );
}

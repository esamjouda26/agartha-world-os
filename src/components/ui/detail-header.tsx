import * as React from "react";

import { cn } from "@/lib/utils";
import { MetadataList, type MetadataItem } from "@/components/ui/metadata-list";

/**
 * DetailHeader — chrome for every `[id]` detail page.
 *
 * Composition:
 *   - Breadcrumb slot (caller renders `<PageBreadcrumb>`).
 *   - Eyebrow (small-caps kicker, e.g. "STAFF · ACTIVE").
 *   - h1 title + optional trailing status badge.
 *   - Description line.
 *   - Metadata strip (`<MetadataList layout="inline">` by default).
 *   - Action cluster (primary + secondary buttons).
 *
 * Distinct from `<PageHeader>` — that primitive is for index/list pages
 * and uses `metaSlot` for filters. `<DetailHeader>` is for single-
 * resource views and exposes `metadata` specifically for dt/dd pairs.
 *
 * Heading level is fixed at `h1` (one per page, CLAUDE.md §5).
 */

export type DetailHeaderProps = Readonly<{
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  /** Trailing element next to the title — typically a `<StatusBadge>`. */
  status?: React.ReactNode;
  /** Inline metadata strip ("Created by", "Updated 2h ago", etc.). */
  metadata?: readonly MetadataItem[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

export function DetailHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  status,
  metadata,
  primaryAction,
  secondaryActions,
  className,
  "data-testid": testId,
}: DetailHeaderProps) {
  return (
    <header
      data-slot="detail-header"
      data-testid={testId}
      className={cn("border-border-subtle flex flex-col gap-4 border-b pb-6", className)}
    >
      {breadcrumbs ? <div className="text-foreground-subtle text-xs">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <p
              data-slot="detail-header-eyebrow"
              className="text-brand-primary text-[11px] font-medium tracking-wider uppercase"
            >
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1
              data-slot="detail-header-title"
              className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl"
            >
              {title}
            </h1>
            {status ? <span className="shrink-0">{status}</span> : null}
          </div>
          {description ? (
            <p className="text-foreground-muted max-w-prose text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {primaryAction || secondaryActions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
      {metadata && metadata.length > 0 ? <MetadataList items={metadata} layout="inline" /> : null}
    </header>
  );
}

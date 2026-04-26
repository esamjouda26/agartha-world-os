import type { ReactNode } from "react";

type CrewPageHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  /** Optional right-side action slot (e.g. a filter button or live badge). */
  action?: ReactNode;
  "data-testid"?: string;
}>;

/**
 * Standardised page header for all crew portal routes.
 *
 * Renders a sticky top bar with h1 title + optional subtitle and right-slot
 * action. Chrome is consistent across the 13 Phase-8 crew routes:
 *   - Sticky top, border-b
 *   - px-4 py-3 padding
 *   - h1 at text-lg font-semibold
 *   - subtitle at text-xs text-muted-foreground
 *
 * Consumers: all src/app/[locale]/(crew)/crew/ page.tsx files.
 * Not for management/admin portals — those use StandardPageShell.
 */
export function CrewPageHeader({
  title,
  subtitle,
  action,
  "data-testid": testId,
}: CrewPageHeaderProps) {
  return (
    <header
      className="border-border bg-background shrink-0 border-b px-4 py-3"
      data-testid={testId ?? `crew-page-header-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

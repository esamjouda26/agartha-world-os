import * as React from "react";

import { cn } from "@/lib/utils";
import { DetailHeader, type DetailHeaderProps } from "@/components/ui/detail-header";
import { PageBreadcrumb, type PageBreadcrumbProps } from "@/components/ui/page-breadcrumb";
import { TabPanel, type TabPanelProps } from "@/components/ui/tab-panel";

/**
 * DetailPageShell — chrome for every `[id]` detail route.
 *
 * Composes:
 *   - Typed-route breadcrumb → detail header (title + status + metadata).
 *   - Optional tab panel slot (overview / related / history).
 *   - Optional aside (right column) for contextual panels
 *     (device health, permissions, activity feed).
 *
 * Pattern C: the RSC parent resolves the entity + metadata + tab content
 * and passes them as named slots. The shell does not self-fetch.
 *
 * When a page needs neither tabs nor an aside, prefer `<DetailHeader>`
 * directly over this shell.
 */

export type DetailPageShellProps = Readonly<{
  breadcrumb?: PageBreadcrumbProps["items"];
  /** Every prop on `<DetailHeader>`. `breadcrumbs` is handled by `breadcrumb`. */
  header: Omit<DetailHeaderProps, "breadcrumbs">;
  /** When provided, renders a `<TabPanel>` below the header. */
  tabs?: TabPanelProps;
  /** Right-column aside (width matched to md+). */
  aside?: React.ReactNode;
  /** Top-level wrapper class. */
  className?: string;
  /** Main content wrapper class — applies to the tab/children region. */
  contentClassName?: string;
  "data-testid"?: string;
  /** Content rendered below the header when `tabs` is omitted. */
  children?: React.ReactNode;
}>;

export function DetailPageShell({
  breadcrumb,
  header,
  tabs,
  aside,
  className,
  contentClassName,
  "data-testid": testId,
  children,
}: DetailPageShellProps) {
  const body = tabs ? <TabPanel {...tabs} /> : children;

  return (
    <div
      data-slot="detail-page-shell"
      data-testid={testId}
      className={cn("flex flex-col gap-6", className)}
    >
      <DetailHeader
        {...header}
        {...(breadcrumb ? { breadcrumbs: <PageBreadcrumb items={breadcrumb} /> } : {})}
      />
      {aside ? (
        <div
          data-slot="detail-page-shell-body"
          className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
        >
          <main className={cn("flex flex-col gap-6", contentClassName)}>{body}</main>
          <aside
            data-slot="detail-page-shell-aside"
            className="flex flex-col gap-4 lg:sticky lg:top-20 lg:h-fit"
          >
            {aside}
          </aside>
        </div>
      ) : (
        <main
          data-slot="detail-page-shell-main"
          className={cn("flex flex-col gap-6", contentClassName)}
        >
          {body}
        </main>
      )}
    </div>
  );
}

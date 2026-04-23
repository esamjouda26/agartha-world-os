import * as React from "react";

import { cn } from "@/lib/utils";
import { PageHeader, type PageHeaderProps } from "@/components/ui/page-header";
import { PageBreadcrumb, type PageBreadcrumbProps } from "@/components/ui/page-breadcrumb";

/**
 * StandardPageShell — chrome wrapper for generic feature pages.
 *
 * Covers the "neither list nor detail" shape: settings pages, dashboard
 * landings, reports landing, form-only screens. Replaces the hand-rolled
 * `<PageBreadcrumb /> + <PageHeader /> + <main>` scaffold that every
 * route currently rebuilds.
 *
 * For list pages with filters + data table, compose
 * `<FilterableDataTable>`. For `[id]` detail pages, compose
 * `<DetailPageShell>`.
 *
 * Pattern C: this is a layout shell. Data lives in slots (`children`,
 * `header`, etc.) injected by the RSC page. The shell itself does not
 * fetch anything.
 */

export type StandardPageShellProps = Readonly<{
  /** Breadcrumb trail — rendered above the header. */
  breadcrumb?: PageBreadcrumbProps["items"];
  /**
   * Page header props — every property of `<PageHeader>` is forwarded.
   * When omitted, the shell still renders the breadcrumb and content
   * (useful for sub-page chrome where the parent provides the `h1`).
   */
  header?: Omit<PageHeaderProps, "breadcrumbs">;
  /** Max-width constraint for content region. Defaults to `none`. */
  maxWidth?: "none" | "3xl" | "5xl" | "7xl";
  /** Optional top-level wrapper class. */
  className?: string;
  /** Content wrapper class (beneath the header). */
  contentClassName?: string;
  "data-testid"?: string;
  children: React.ReactNode;
}>;

const MAX_WIDTH: Record<NonNullable<StandardPageShellProps["maxWidth"]>, string> = {
  none: "",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "7xl": "max-w-7xl",
};

export function StandardPageShell({
  breadcrumb,
  header,
  maxWidth = "none",
  className,
  contentClassName,
  "data-testid": testId,
  children,
}: StandardPageShellProps) {
  return (
    <div
      data-slot="standard-page-shell"
      data-testid={testId}
      className={cn("flex flex-col gap-6", className)}
    >
      {header ? (
        <PageHeader
          {...header}
          {...(breadcrumb ? { breadcrumbs: <PageBreadcrumb items={breadcrumb} /> } : {})}
        />
      ) : breadcrumb ? (
        <PageBreadcrumb items={breadcrumb} />
      ) : null}
      <main
        data-slot="standard-page-shell-main"
        className={cn(
          "flex w-full flex-col gap-6",
          maxWidth !== "none" ? `${MAX_WIDTH[maxWidth]} mx-auto` : null,
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}

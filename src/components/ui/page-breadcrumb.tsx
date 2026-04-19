import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * PageBreadcrumb — prompt.md §2B-D.6.
 *
 * Typed-route breadcrumb wrapper. Every href is `Route` so `typedRoutes`
 * (prompt.md rule 17) catches broken paths at compile time. The shadcn
 * `Breadcrumb*` low-level parts remain available for bespoke layouts.
 */

export type BreadcrumbItemInput = Readonly<
  | { label: React.ReactNode; href: Route; current?: false }
  | { label: React.ReactNode; href?: undefined; current: true }
>;

export type PageBreadcrumbProps = Readonly<{
  items: readonly BreadcrumbItemInput[];
  /** Max visible leading crumbs before ellipsis; tail is always shown. */
  maxVisible?: number;
  className?: string;
  "data-testid"?: string;
}>;

export function PageBreadcrumb({
  items,
  maxVisible = 4,
  className,
  "data-testid": testId,
}: PageBreadcrumbProps) {
  const shouldTruncate = items.length > maxVisible;
  const visible: readonly BreadcrumbItemInput[] = shouldTruncate
    ? [items[0]!, ...items.slice(items.length - (maxVisible - 1))]
    : items;

  return (
    <BreadcrumbRoot data-slot="page-breadcrumb" data-testid={testId} className={cn(className)}>
      <BreadcrumbList>
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1;
          const showEllipsis = shouldTruncate && index === 1;
          return (
            <React.Fragment key={`${index}-${String(item.label)}`}>
              {showEllipsis ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}
              <BreadcrumbItem>
                {item.current || isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href!}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}

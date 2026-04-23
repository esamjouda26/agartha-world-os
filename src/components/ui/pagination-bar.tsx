"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * PaginationBar — pager + page-size selector + total-count summary.
 *
 * Two modes mirror `<DataTable>`'s pagination contract:
 *   - offset: full page controls (First / Prev / Next / Last + "Page N of M").
 *   - cursor: Prev / Next only (no total or page index).
 *
 * Both modes support an optional page-size selector on the left. Totals
 * are rendered `tabular-nums` so they don't jump as counts change. Caller
 * owns every state transition — this primitive is pure chrome.
 *
 * Use the low-level `<Pagination>` primitives from `@/components/ui/
 * pagination` directly when you need a custom non-table pager (e.g. a
 * marketing catalog grid). Use `<PaginationBar>` for admin tables.
 */

type PaginationBarOffsetProps = Readonly<{
  mode: "offset";
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  totalRowCount?: number;
  onPageChange: (index: number) => void;
}>;

type PaginationBarCursorProps = Readonly<{
  mode: "cursor";
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Optional total for display — cursor pagination usually has none. */
  totalRowCount?: number;
}>;

export type PaginationBarProps = (PaginationBarOffsetProps | PaginationBarCursorProps) & {
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  pageSize?: number;
  className?: string;
  "data-testid"?: string;
};

const DEFAULT_PAGE_SIZES: readonly number[] = [10, 25, 50, 100];

export function PaginationBar(props: PaginationBarProps) {
  const {
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    className,
    "data-testid": testId,
  } = props;
  const pageSize = "pageSize" in props ? props.pageSize : undefined;

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination-bar"
      data-testid={testId}
      className={cn("flex flex-col items-center gap-2 sm:flex-row sm:justify-between", className)}
    >
      <div className="text-foreground-subtle flex items-center gap-3 text-xs">
        {onPageSizeChange && pageSize !== undefined ? (
          <span className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(next) => onPageSizeChange(Number(next))}
            >
              <SelectTrigger
                size="sm"
                data-testid={testId ? `${testId}-page-size` : undefined}
                className="h-8 w-[4.5rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        ) : null}
        {props.mode === "offset" && props.totalRowCount !== undefined ? (
          <span className="tabular-nums">{props.totalRowCount.toLocaleString()} rows</span>
        ) : null}
      </div>

      {props.mode === "offset" ? (
        <OffsetControls {...props} {...(testId !== undefined ? { testId } : {})} />
      ) : (
        <CursorControls {...props} {...(testId !== undefined ? { testId } : {})} />
      )}
    </nav>
  );
}

function OffsetControls({
  pageIndex,
  pageCount,
  onPageChange,
  testId,
}: PaginationBarOffsetProps & { testId?: string }) {
  const isFirst = pageIndex <= 0;
  const isLast = pageIndex + 1 >= pageCount;
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground-muted text-xs tabular-nums">
        Page {pageIndex + 1} / {Math.max(pageCount, 1)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={isFirst}
          onClick={() => onPageChange(pageIndex - 1)}
          data-testid={testId ? `${testId}-prev` : undefined}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={isLast}
          onClick={() => onPageChange(pageIndex + 1)}
          data-testid={testId ? `${testId}-next` : undefined}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function CursorControls({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  testId,
}: PaginationBarCursorProps & { testId?: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasPrev}
        onClick={onPrev}
        data-testid={testId ? `${testId}-prev` : undefined}
      >
        <ChevronLeft aria-hidden className="size-4" />
        Previous
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={onNext}
        data-testid={testId ? `${testId}-next` : undefined}
      >
        Next
        <ChevronRight aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

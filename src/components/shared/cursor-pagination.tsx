"use client";

import * as React from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { RotateCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination-bar";

/**
 * CursorPagination — fully self-contained cursor pagination chrome.
 *
 * Owns ALL URL state for cursor-paginated tables so feature pages don't
 * rebuild the same machinery (cursor history stack, page-size selection,
 * Back-to-newest reset). A new cursor-paginated page becomes a one-liner
 * inside `<FilterableDataTable pagination={<CursorPagination ... />}>`.
 *
 * Three URL params (names overridable):
 *   - `cursor`   — opaque cursor token for the current page. Server-read.
 *                  Triggers RSC refetch (`shallow: false`).
 *   - `crumbs`   — `~`-delimited stack of cursors we've left behind via
 *                  Next, used to navigate Prev one page back. Client-only
 *                  (`shallow: true`) — server doesn't read it.
 *   - `pageSize` — rows per page. Server-read. Resets cursor + crumbs on
 *                  change (old cursors point into a different window).
 *
 * Caller responsibilities:
 *   1. Pass `nextCursorToken` (the encoded next cursor from the server
 *      response, or `null` when on the last page). Cursor format is
 *      opaque to this component — caller encodes once on the server-
 *      shape side, server decodes on receipt.
 *   2. Validate `pageSize` server-side against the same `pageSizeOptions`
 *      list. The component bounds it client-side too, but the server
 *      MUST validate (URL params are user input).
 *
 * Cursor format collision: the default `~` crumb delimiter is safe for
 * the audit cursor format `<iso>|<uuid>` (no `~` in either component).
 * If your cursor format may contain `~`, override `crumbDelimiter`.
 */

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_CRUMB_DELIMITER = "~";

/**
 * Sentinel pushed onto the crumb stack when the user clicks Next from
 * the head (where `cursor === null`). Cannot collide with a real cursor:
 * real cursors carry a `|` and a timestamp prefix, neither of which
 * start with `@`. Without this sentinel, a `null` cursor would be
 * encoded as the empty string — and an empty string can't survive the
 * URL → state round-trip (`?crumbs=` decodes back to no crumbs at all
 * because the value is falsy), so Prev would silently lose its way
 * back to head.
 */
const HEAD_SENTINEL = "@head";

const NUQS_OPTS_SERVER_SYNCED = {
  clearOnDefault: true,
  history: "replace" as const,
  shallow: false as const,
};

const NUQS_OPTS_CLIENT_ONLY = {
  clearOnDefault: true,
  history: "replace" as const,
  shallow: true as const,
};

export type CursorPaginationProps = Readonly<{
  /**
   * Opaque cursor token for the next page, or `null` when on the last
   * page. Caller encodes from server response (e.g.
   * `page.nextCursor ? encodeCursor(page.nextCursor.createdAt, page.nextCursor.id) : null`).
   */
  nextCursorToken: string | null;
  /** Allowed page sizes. Defaults to `[10, 25, 50, 100]`. */
  pageSizeOptions?: readonly number[];
  /** Default page size. Defaults to `10`. */
  defaultPageSize?: number;
  /** URL param name for the active cursor. Defaults to `"cursor"`. */
  cursorParam?: string;
  /** URL param name for the cursor history stack. Defaults to `"crumbs"`. */
  crumbsParam?: string;
  /** URL param name for the page size. Defaults to `"pageSize"`. */
  pageSizeParam?: string;
  /** Crumb stack delimiter. Defaults to `"~"`. */
  crumbDelimiter?: string;
  /** Show the small "Back to newest" reset link when off-head. Default `true`. */
  showResetToHead?: boolean;
  resetLabel?: string;
  /** Fires after Prev / Next / page-size change. Use for scroll-to-top. */
  onAfterPaginate?: () => void;
  className?: string;
  "data-testid"?: string;
}>;

function encodeCrumbs(crumbs: readonly string[], delimiter: string): string | null {
  return crumbs.length > 0 ? crumbs.join(delimiter) : null;
}

function decodeCrumbs(serialized: string | null, delimiter: string): readonly string[] {
  if (serialized === null || serialized.length === 0) return [];
  // Don't filter empty members — every element in `split` is a crumb,
  // including the head sentinel which we encode as a non-empty string
  // anyway. Filtering would only mask format bugs.
  return serialized.split(delimiter);
}

export function CursorPagination({
  nextCursorToken,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  cursorParam = "cursor",
  crumbsParam = "crumbs",
  pageSizeParam = "pageSize",
  crumbDelimiter = DEFAULT_CRUMB_DELIMITER,
  showResetToHead = true,
  resetLabel = "Back to newest",
  onAfterPaginate,
  className,
  "data-testid": testId,
}: CursorPaginationProps) {
  const [cursor, setCursor] = useQueryState(
    cursorParam,
    parseAsString.withOptions(NUQS_OPTS_SERVER_SYNCED),
  );
  const [crumbsRaw, setCrumbsRaw] = useQueryState(
    crumbsParam,
    parseAsString.withOptions(NUQS_OPTS_CLIENT_ONLY),
  );
  const [pageSize, setPageSize] = useQueryState(
    pageSizeParam,
    parseAsInteger.withOptions(NUQS_OPTS_SERVER_SYNCED),
  );

  const crumbs = React.useMemo(
    () => decodeCrumbs(crumbsRaw, crumbDelimiter),
    [crumbsRaw, crumbDelimiter],
  );
  const effectivePageSize = pageSize ?? defaultPageSize;

  const afterPaginate = React.useCallback((): void => {
    onAfterPaginate?.();
  }, [onAfterPaginate]);

  const handleNext = (): void => {
    if (!nextCursorToken) return;
    // Push the cursor that produced THIS page onto the crumb stack.
    // When we're on head (`cursor === null`), push HEAD_SENTINEL — that
    // way Prev can pop it back to a true `null` cursor instead of being
    // lost to the URL serializer's empty-string-eats-the-param edge.
    const stash = cursor ?? HEAD_SENTINEL;
    void setCrumbsRaw(encodeCrumbs([...crumbs, stash], crumbDelimiter));
    void setCursor(nextCursorToken);
    afterPaginate();
  };

  const handlePrev = (): void => {
    if (crumbs.length === 0) return;
    const next = crumbs.slice(0, -1);
    const popped = crumbs[crumbs.length - 1];
    void setCrumbsRaw(encodeCrumbs(next, crumbDelimiter));
    // `popped === HEAD_SENTINEL` → restore null cursor (head).
    // `popped === undefined` (defensive — shouldn't happen given the
    // length guard above) → also fall back to head.
    void setCursor(popped && popped !== HEAD_SENTINEL ? popped : null);
    afterPaginate();
  };

  const handleResetToHead = (): void => {
    void setCursor(null);
    void setCrumbsRaw(null);
    afterPaginate();
  };

  const handlePageSizeChange = (size: number): void => {
    // Page-size change resets pagination — old cursors point into a
    // differently-sized window so reusing them would skip rows.
    const allowed = pageSizeOptions.includes(size) ? size : defaultPageSize;
    void setPageSize(allowed === defaultPageSize ? null : allowed);
    void setCursor(null);
    void setCrumbsRaw(null);
  };

  const isAtHead = crumbs.length === 0 && !cursor;

  return (
    <div
      data-slot="cursor-pagination"
      data-testid={testId}
      className={cn(
        "flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <PaginationBar
        mode="cursor"
        hasPrev={crumbs.length > 0}
        hasNext={Boolean(nextCursorToken)}
        onPrev={handlePrev}
        onNext={handleNext}
        pageSize={effectivePageSize}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={pageSizeOptions}
        className="flex-1"
        {...(testId ? { "data-testid": `${testId}-bar` } : {})}
      />
      {showResetToHead && !isAtHead ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetToHead}
          {...(testId ? { "data-testid": `${testId}-reset` } : {})}
          className="text-foreground-subtle hover:text-foreground self-end sm:self-auto"
        >
          <RotateCw aria-hidden className="size-3.5" />
          <span>{resetLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}

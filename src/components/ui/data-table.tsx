"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Columns3, LayoutList, Table2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableSkeleton } from "@/components/ui/skeleton-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Per-column className passthrough — TanStack `ColumnMeta` augmentation.
 *
 * Lets callers attach CSS to specific column headers / cells without forking
 * the body renderers. Used heavily by the intrinsic-width pattern on text-
 * dense tables: pass `meta: { headerClassName: "w-0 whitespace-nowrap",
 * cellClassName: "w-0 whitespace-nowrap" }` to make a column shrink-wrap
 * its contents while siblings absorb remaining width.
 *
 * Augmentation is module-scoped; `unknown` generics keep it safe under
 * `noImplicitAny`.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Tailwind classes applied to the `<TableHead>` for this column. */
    headerClassName?: string;
    /** Tailwind classes applied to every `<TableCell>` for this column. */
    cellClassName?: string;
  }
}

// `RowData` is the constraint TanStack's ColumnMeta generic uses. Re-import
// the type without polluting the value namespace.
import type { RowData } from "@tanstack/react-table";

/**
 * DataTable — prompt.md §2B-D.4.
 *
 * TanStack-backed table with:
 *  - configurable cursor OR offset pagination (passed in by caller — the
 *    primitive renders the control, but server-side paging is the caller's
 *    concern)
 *  - column visibility toggle via dropdown
 *  - density toggle (compact / comfortable / spacious)
 *  - sticky header while scrolling inside a fixed-height container
 *  - row selection + a `<BulkActionBar>` slot that appears when rows selected
 *  - auto-virtualization when `rowCount > VIRTUALIZE_THRESHOLD`
 *  - mobile collapse under md breakpoint via the required
 *    `mobileFieldPriority: string[]` prop (rendered as `<CardList>`)
 */

const VIRTUALIZE_THRESHOLD = 100;
const ROW_HEIGHT_PX: Record<Density, number> = {
  compact: 32,
  comfortable: 40,
  spacious: 52,
};

export type Density = "compact" | "comfortable" | "spacious";

type PaginationControl =
  | {
      mode: "offset";
      pageIndex: number;
      pageSize: number;
      pageCount: number;
      onPageChange: (index: number) => void;
    }
  | {
      mode: "cursor";
      hasPrev: boolean;
      hasNext: boolean;
      onPrev: () => void;
      onNext: () => void;
    };

export type DataTableProps<TData> = Readonly<{
  data: readonly TData[];
  columns: ColumnDef<TData, unknown>[];
  /**
   * Ordered list of column IDs shown on card-view (< md breakpoint).
   * Required per prompt.md §2B-D.4 mobile-collapse contract.
   */
  mobileFieldPriority: readonly string[];
  getRowId: (row: TData, index: number) => string;

  density?: Density;
  onDensityChange?: (density: Density) => void;
  defaultVisibility?: VisibilityState;
  onVisibilityChange?: (value: VisibilityState) => void;
  sorting?: SortingState;
  onSortingChange?: (value: SortingState) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (value: RowSelectionState) => void;
  /** Shown above the table when `rowSelection.size > 0`. */
  bulkActionBar?: (ctx: { selectedIds: readonly string[]; clear: () => void }) => React.ReactNode;
  /** Empty-state slot shown in place of the body when `data.length === 0`. */
  empty?: React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  pagination?: PaginationControl;
  /**
   * Total expected row count. When `> VIRTUALIZE_THRESHOLD` the table switches
   * to a virtualized body. Defaults to `data.length`.
   */
  rowCount?: number;
  /**
   * Height of the scroll viewport when virtualized. Tailwind height class.
   * Defaults to 480px.
   */
  viewportClassName?: string;
  /**
   * Optional whole-row click handler. When set, every row (desktop table,
   * virtualized table, and mobile card) becomes tappable and renders a
   * pointer cursor. Interactive child elements (buttons, checkboxes,
   * links) should `stopPropagation()` to avoid double-firing.
   */
  onRowClick?: (row: TData) => void;
  /**
   * Toolbar mode. Controls which admin-oriented affordances render above
   * the table body:
   *   `"full"`    (default) — row count + density dropdown + columns
   *                dropdown. For admin/management tables where users
   *                benefit from shaping dense data.
   *   `"compact"` — row count only. For mid-size read-only tables where
   *                the total is meaningful but the user has no reason to
   *                hide columns or change density.
   *   `"none"`    — no toolbar rendered at all. For consumer surfaces
   *                (crew views, personal dashboards) where density /
   *                column controls are noise.
   */
  toolbar?: "full" | "compact" | "none";
  /**
   * Outer chrome around the table body.
   *   `"card"` (default) — the table renders inside its own bordered
   *                       card surface (`bg-card`, hairline border,
   *                       rounded-xl, soft shadow). Used by every
   *                       standalone `<DataTable>` caller.
   *   `"none"`           — no outer card; only the inner overflow
   *                       wrapper. Used by `<FilterableDataTable>`
   *                       which provides its own unified frame around
   *                       toolbar + body + pagination ("Premium Frame").
   */
  frame?: "card" | "none";
  /**
   * When set, every row becomes expandable and this fn renders the
   * expanded panel below it (full-width `colSpan` `<TableRow>` on
   * desktop, inline panel inside the `<li>` on mobile). Each row is
   * toggled via TanStack's expansion model — callers either let the
   * caller-defined "expander" column call `row.getToggleExpandedHandler()`
   * OR rely on the auto whole-row click toggle on mobile.
   *
   * Note: virtualization is automatically disabled when this prop is
   * provided — `useVirtualizer`'s fixed `estimateSize` is incompatible
   * with variable-height expanded sub-rows.
   */
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
  /** Controlled expansion state (TanStack `ExpandedState`). */
  expanded?: ExpandedState;
  onExpandedChange?: (value: ExpandedState) => void;
  className?: string;
  "data-testid"?: string;
}>;

export function DataTable<TData>(props: DataTableProps<TData>) {
  const {
    data,
    columns,
    mobileFieldPriority,
    getRowId,
    density: densityProp,
    onDensityChange,
    defaultVisibility,
    onVisibilityChange,
    sorting: sortingProp,
    onSortingChange,
    rowSelection: rowSelectionProp,
    onRowSelectionChange,
    bulkActionBar,
    empty,
    isLoading,
    skeletonRows = 6,
    pagination,
    rowCount,
    viewportClassName,
    onRowClick,
    toolbar: toolbarMode = "full",
    frame = "card",
    renderSubComponent,
    expanded: expandedProp,
    onExpandedChange,
    className,
    "data-testid": testId,
  } = props;

  const [densityState, setDensityState] = React.useState<Density>(densityProp ?? "comfortable");
  const density = densityProp ?? densityState;
  const setDensity = (next: Density): void => {
    if (!densityProp) setDensityState(next);
    onDensityChange?.(next);
  };

  const [visibility, setVisibility] = React.useState<VisibilityState>(defaultVisibility ?? {});
  const [sortingState, setSortingState] = React.useState<SortingState>([]);
  const sorting = sortingProp ?? sortingState;

  const [rowSelectionState, setRowSelectionState] = React.useState<RowSelectionState>({});
  const rowSelection = rowSelectionProp ?? rowSelectionState;

  const [expandedState, setExpandedState] = React.useState<ExpandedState>({});
  const expanded = expandedProp ?? expandedState;

  // Mutable references so writable array/record types satisfy TanStack typing.
  const mutableData = React.useMemo<TData[]>(() => data.slice(), [data]);
  const mutableColumns = React.useMemo<ColumnDef<TData, unknown>[]>(
    () => columns.slice(),
    [columns],
  );

  const expandable = Boolean(renderSubComponent);

  const table = useReactTable<TData>({
    data: mutableData,
    columns: mutableColumns,
    getRowId,
    state: { columnVisibility: visibility, sorting, rowSelection, expanded },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(visibility) : updater;
      setVisibility(next);
      onVisibilityChange?.(next);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (!sortingProp) setSortingState(next);
      onSortingChange?.(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      if (!rowSelectionProp) setRowSelectionState(next);
      onRowSelectionChange?.(next);
    },
    onExpandedChange: (updater) => {
      const next = typeof updater === "function" ? updater(expanded) : updater;
      if (expandedProp === undefined) setExpandedState(next);
      onExpandedChange?.(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => expandable,
    enableRowSelection: Boolean(bulkActionBar),
    enableExpanding: expandable,
  });

  const totalRowCount = rowCount ?? data.length;
  // Variable-height expanded sub-rows are incompatible with the virtualizer's
  // fixed `estimateSize` — disable virtualization whenever sub-rows are in
  // play (documented in `renderSubComponent` JSDoc).
  const shouldVirtualize = !expandable && totalRowCount > VIRTUALIZE_THRESHOLD;

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const clearSelection = React.useCallback(() => {
    if (!rowSelectionProp) setRowSelectionState({});
    onRowSelectionChange?.({});
  }, [rowSelectionProp, onRowSelectionChange]);

  return (
    <div
      data-slot="data-table"
      data-testid={testId}
      data-density={density}
      className={cn("flex flex-col gap-3", className)}
    >
      {toolbarMode !== "none" ? (
        <Toolbar
          table={table}
          density={density}
          onDensityChange={setDensity}
          totalRowCount={totalRowCount}
          mode={toolbarMode}
        />
      ) : null}

      {selectedIds.length > 0 && bulkActionBar ? (
        <div
          role="region"
          aria-label={`${selectedIds.length} selected`}
          data-slot="data-table-bulk-bar"
          className="border-brand-primary/40 bg-brand-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <span className="text-foreground text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            {bulkActionBar({ selectedIds, clear: clearSelection })}
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <TableSkeleton rows={skeletonRows} cols={table.getVisibleLeafColumns().length || 4} />
      ) : data.length === 0 ? (
        (empty ?? (
          <div className="border-border text-foreground-muted rounded-lg border border-dashed p-8 text-center text-sm">
            No rows to display.
          </div>
        ))
      ) : (
        <>
          <div className="md:hidden">
            <CardListView
              table={table}
              priority={mobileFieldPriority}
              enableSelection={Boolean(bulkActionBar)}
              {...(onRowClick !== undefined ? { onRowClick } : {})}
              {...(renderSubComponent !== undefined ? { renderSubComponent } : {})}
            />
          </div>
          <div className="hidden md:block">
            {shouldVirtualize ? (
              <VirtualizedBody
                table={table}
                density={density}
                frame={frame}
                {...(viewportClassName !== undefined ? { viewportClassName } : {})}
                {...(onRowClick !== undefined ? { onRowClick } : {})}
              />
            ) : (
              <StandardBody
                table={table}
                density={density}
                frame={frame}
                {...(onRowClick !== undefined ? { onRowClick } : {})}
                {...(renderSubComponent !== undefined ? { renderSubComponent } : {})}
              />
            )}
          </div>
        </>
      )}

      {pagination ? <Pagination control={pagination} /> : null}
    </div>
  );
}

function Toolbar<TData>({
  table,
  density,
  onDensityChange,
  totalRowCount,
  mode,
}: Readonly<{
  table: TanstackTable<TData>;
  density: Density;
  onDensityChange: (density: Density) => void;
  totalRowCount: number;
  mode: "full" | "compact";
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-foreground-subtle text-xs tabular-nums">
        {totalRowCount.toLocaleString()} rows
      </p>
      {mode === "full" ? (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="data-table-density">
                {density === "compact" ? (
                  <Table2 aria-hidden className="size-4" />
                ) : (
                  <LayoutList aria-hidden className="size-4" />
                )}
                Density
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Row density</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["compact", "comfortable", "spacious"] as const).map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={density === value}
                  onCheckedChange={() => onDensityChange(value)}
                >
                  {value}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="data-table-columns">
                <Columns3 aria-hidden className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((col) =>
                col.getCanHide() ? (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(Boolean(value))}
                    className="capitalize"
                  >
                    {String(col.columnDef.header ?? col.id)}
                  </DropdownMenuCheckboxItem>
                ) : null,
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}

function StandardBody<TData>({
  table,
  density,
  frame,
  onRowClick,
  renderSubComponent,
}: Readonly<{
  table: TanstackTable<TData>;
  density: Density;
  frame: "card" | "none";
  onRowClick?: (row: TData) => void;
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
}>) {
  // StandardBody composes the shadcn `<Table>` primitives so table theming
  // lives in ONE file (`table.tsx`). Padding, hover tint, and selected-row
  // treatment layer on via className overrides — `<TableRow>` already
  // paints the base hover/selected styles; we upgrade hover to
  // `surface/90` + a gold ring on selected to keep dense admin dashboards
  // legible (the shadcn default `muted/50` is too subtle under warm-gold
  // accents). The sticky-frost header lives on `<TableHeader>` — that is
  // the sanctioned frost use site per `globals.css`.
  //
  // Per-column className passthrough via `meta.headerClassName` /
  // `meta.cellClassName` lets callers shrink-wrap shrink-fit columns
  // (badges, timestamps) using `w-0 whitespace-nowrap` while leaving
  // textual columns fluid.
  //
  // Frame chrome is conditional: `frame="card"` (default, standalone use)
  // wraps the table in the bordered card; `frame="none"` (used by
  // `<FilterableDataTable>`) skips the wrapper because the parent
  // organism owns the unified Premium Frame around toolbar + body +
  // pagination.
  //
  // VirtualizedBody and CardListView intentionally do NOT use these
  // primitives — a virtualized grid requires absolute-positioned
  // `<div role="row">` (a real `<tbody>` can't host `transform:
  // translateY(...)`), and card-list renders `<ul>/<li>`.
  const rowPadding =
    density === "compact" ? "px-3 py-1.5" : density === "spacious" ? "px-4 py-3" : "px-4 py-2";
  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <div
      data-slot="data-table-standard"
      className={cn(
        "overflow-x-auto",
        frame === "card" ? "border-border-subtle bg-card rounded-xl border shadow-xs" : null,
      )}
    >
      <Table className="border-collapse text-left">
        <TableHeader className="sticky top-0 z-[1] bg-[color:var(--frost-bg-sm)] [backdrop-filter:var(--frost-blur-sm)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-border-subtle border-b hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sort = header.column.getIsSorted();
                const headerClassName = header.column.columnDef.meta?.headerClassName;
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(
                      "text-foreground-subtle h-auto text-[11px] font-medium tracking-wider uppercase",
                      rowPadding,
                      headerClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="hover:text-foreground inline-flex items-center gap-1"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sort === "asc" ? <ChevronUp className="size-3" /> : null}
                        {sort === "desc" ? <ChevronDown className="size-3" /> : null}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isExpanded = row.getIsExpanded();
            // When `renderSubComponent` is set and the caller hasn't
            // provided a whole-row click handler, the row itself becomes
            // the expand-toggle affordance — saves every caller from
            // wiring a chevron column + explicit click handler. Matches
            // the same behavior in `CardListView` (mobile).
            const rowActivate: (() => void) | undefined = onRowClick
              ? () => onRowClick(row.original)
              : renderSubComponent && row.getCanExpand()
                ? () => row.toggleExpanded()
                : undefined;
            const interactive = Boolean(rowActivate);
            return (
              <React.Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  data-expanded={isExpanded || undefined}
                  onClick={rowActivate}
                  onKeyDown={
                    rowActivate
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            rowActivate();
                          }
                        }
                      : undefined
                  }
                  tabIndex={interactive ? 0 : undefined}
                  role={interactive ? "button" : undefined}
                  aria-expanded={renderSubComponent ? isExpanded : undefined}
                  className={cn(
                    "border-border-subtle transition-colors duration-[var(--duration-micro)]",
                    // Override the base `hover:bg-muted/50` from `table.tsx`
                    // with a stronger `surface/90` + a brand-tinted selected
                    // state. The ring-inset gives selected rows a 1px gold
                    // outline that stays visible on hover.
                    "hover:bg-surface/90 data-[state=selected]:bg-brand-primary/10 data-[state=selected]:ring-brand-primary/20 data-[state=selected]:ring-1 data-[state=selected]:ring-inset",
                    // Expanded parent row drops its own bottom border so the
                    // sub-row reads as one block visually.
                    isExpanded ? "border-b-0" : null,
                    interactive
                      ? "focus-visible:outline-ring cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                      : undefined,
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const cellClassName = cell.column.columnDef.meta?.cellClassName;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn("text-foreground text-sm", rowPadding, cellClassName)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {renderSubComponent && isExpanded ? (
                  <TableRow data-slot="data-table-sub-row" className="hover:bg-transparent">
                    <TableCell
                      colSpan={colSpan}
                      className="bg-surface/40 border-border-subtle border-b px-4 py-3 whitespace-normal"
                    >
                      {renderSubComponent(row)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function VirtualizedBody<TData>({
  table,
  density,
  frame,
  viewportClassName,
  onRowClick,
}: Readonly<{
  table: TanstackTable<TData>;
  density: Density;
  frame: "card" | "none";
  viewportClassName?: string;
  onRowClick?: (row: TData) => void;
}>) {
  // Virtualized body uses ARIA-table-via-roles on `<div>` because absolute
  // positioning + `transform: translateY(...)` cannot live inside a real
  // `<table>`. Sub-rows are NOT supported here (see `renderSubComponent`
  // JSDoc — virtualization is auto-disabled when a sub-component is set).
  const rows = table.getRowModel().rows;
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_PX[density],
    overscan: 10,
  });

  const totalSize = virtualizer.getTotalSize();
  const items = virtualizer.getVirtualItems();
  const visibleCols = table.getVisibleLeafColumns();
  const gridTemplate = visibleCols.map(() => "minmax(0, 1fr)").join(" ");
  const rowPadding =
    density === "compact" ? "px-3 py-1.5" : density === "spacious" ? "px-4 py-3" : "px-4 py-2";

  return (
    <div
      data-slot="data-table-virtualized"
      className={cn(
        "overflow-hidden",
        frame === "card" ? "border-border bg-card rounded-lg border" : null,
      )}
    >
      <div
        role="row"
        className="bg-surface border-border-subtle grid border-b"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {visibleCols.map((col) => (
          <div
            key={col.id}
            role="columnheader"
            className={cn(
              "text-foreground-subtle text-xs font-medium tracking-wider uppercase",
              rowPadding,
              col.columnDef.meta?.headerClassName,
            )}
          >
            {flexRender(col.columnDef.header, {
              column: col,
              header: table.getHeaderGroups()[0]!.headers.find((h) => h.column === col)!,
              table,
            })}
          </div>
        ))}
      </div>
      <div
        ref={parentRef}
        data-slot="data-table-virtual-scroll"
        className={cn("relative overflow-auto", viewportClassName ?? "max-h-[480px]")}
        role="presentation"
      >
        <div style={{ height: totalSize }} className="relative w-full">
          {items.map((virtualRow) => {
            const row = rows[virtualRow.index]!;
            return (
              <div
                key={row.id}
                role={onRowClick ? "button" : "row"}
                data-state={row.getIsSelected() ? "selected" : undefined}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "border-border-subtle hover:bg-surface/60 data-[state=selected]:bg-brand-primary/5 absolute left-0 grid w-full border-b",
                  onRowClick ? "cursor-pointer" : undefined,
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                  gridTemplateColumns: gridTemplate,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    role="cell"
                    className={cn(
                      "text-foreground flex items-center text-sm",
                      rowPadding,
                      cell.column.columnDef.meta?.cellClassName,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CardListView<TData>({
  table,
  priority,
  enableSelection,
  onRowClick,
  renderSubComponent,
}: Readonly<{
  table: TanstackTable<TData>;
  priority: readonly string[];
  enableSelection: boolean;
  onRowClick?: (row: TData) => void;
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
}>) {
  // When `renderSubComponent` is set, every card is expandable. The whole
  // card surface becomes tappable to toggle expansion (so users don't need
  // to hunt for a chevron). When a caller-provided `onRowClick` is ALSO
  // set, expansion wins — `onRowClick` is suppressed on expandable cards
  // because two conflicting whole-card click handlers would be ambiguous.
  // Interactive inner elements (links, buttons) should `stopPropagation`.
  return (
    <ul className="flex flex-col gap-2">
      {table.getRowModel().rows.map((row) => {
        const visibleCells = row.getVisibleCells();
        const cellsById = new Map(visibleCells.map((cell) => [cell.column.id, cell]));
        const canExpand = Boolean(renderSubComponent) && row.getCanExpand();
        const isExpanded = row.getIsExpanded();
        const activate = canExpand
          ? () => row.toggleExpanded()
          : onRowClick
            ? () => onRowClick(row.original)
            : undefined;
        const interactive = Boolean(activate);

        return (
          <li
            key={row.id}
            data-slot="data-table-card"
            data-state={row.getIsSelected() ? "selected" : undefined}
            data-expanded={isExpanded || undefined}
            onClick={activate}
            onKeyDown={
              activate
                ? (event) => {
                    // Only toggle when the keydown originated on the
                    // card itself — not on a descendant input/button.
                    // Without this guard, typing a space inside the
                    // expanded sub-component's textarea bubbles up,
                    // collapses the card, and swallows the keystroke.
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      activate();
                    }
                  }
                : undefined
            }
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            aria-expanded={canExpand ? isExpanded : undefined}
            className={cn(
              "border-border bg-card data-[state=selected]:border-brand-primary/60 data-[state=selected]:bg-brand-primary/5 flex flex-col gap-2 rounded-lg border p-3",
              isExpanded ? "border-brand-primary/40" : null,
              interactive
                ? "active:bg-surface/60 focus-visible:outline-ring cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                : undefined,
            )}
          >
            {enableSelection ? (
              <label className="text-foreground-muted flex items-center gap-2 text-xs">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                  aria-label={`Select row ${row.id}`}
                />
                Select
              </label>
            ) : null}
            {priority.map((columnId) => {
              const cell = cellsById.get(columnId);
              if (!cell) return null;
              const header = cell.column.columnDef.header;
              return (
                <div key={cell.id} className="flex items-start justify-between gap-3">
                  <span className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
                    {typeof header === "string" ? header : columnId}
                  </span>
                  <span className="text-foreground min-w-0 flex-1 text-right text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </span>
                </div>
              );
            })}
            {renderSubComponent && isExpanded ? (
              <div
                data-slot="data-table-card-sub"
                onClick={(event) => event.stopPropagation()}
                className="border-border-subtle bg-surface/40 -mx-3 mt-1 -mb-3 border-t px-3 py-3"
              >
                {renderSubComponent(row)}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Pagination({ control }: Readonly<{ control: PaginationControl }>) {
  if (control.mode === "offset") {
    const { pageIndex, pageCount, onPageChange } = control;
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground-subtle text-xs tabular-nums">
          Page {pageIndex + 1} / {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex + 1 >= pageCount}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={!control.hasPrev} onClick={control.onPrev}>
        Previous
      </Button>
      <Button variant="outline" size="sm" disabled={!control.hasNext} onClick={control.onNext}>
        Next
      </Button>
    </div>
  );
}

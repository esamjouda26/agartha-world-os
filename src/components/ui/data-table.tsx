"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Columns3, LayoutList, Table2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
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

  // Mutable references so writable array/record types satisfy TanStack typing.
  const mutableData = React.useMemo<TData[]>(() => data.slice(), [data]);
  const mutableColumns = React.useMemo<ColumnDef<TData, unknown>[]>(
    () => columns.slice(),
    [columns],
  );

  const table = useReactTable<TData>({
    data: mutableData,
    columns: mutableColumns,
    getRowId,
    state: { columnVisibility: visibility, sorting, rowSelection },
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: Boolean(bulkActionBar),
  });

  const totalRowCount = rowCount ?? data.length;
  const shouldVirtualize = totalRowCount > VIRTUALIZE_THRESHOLD;

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
      <Toolbar
        table={table}
        density={density}
        onDensityChange={setDensity}
        totalRowCount={totalRowCount}
      />

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
            />
          </div>
          <div className="hidden md:block">
            {shouldVirtualize ? (
              <VirtualizedBody
                table={table}
                density={density}
                viewportClassName={viewportClassName}
              />
            ) : (
              <StandardBody table={table} density={density} />
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
}: Readonly<{
  table: TanstackTable<TData>;
  density: Density;
  onDensityChange: (density: Density) => void;
  totalRowCount: number;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-foreground-subtle text-xs tabular-nums">
        {totalRowCount.toLocaleString()} rows
      </p>
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
    </div>
  );
}

function StandardBody<TData>({
  table,
  density,
}: Readonly<{ table: TanstackTable<TData>; density: Density }>) {
  const rowPadding =
    density === "compact" ? "px-3 py-1.5" : density === "spacious" ? "px-4 py-3" : "px-4 py-2";

  return (
    <div className="border-border bg-card overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface sticky top-0 z-[1]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-border-subtle border-b">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sort = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "text-foreground-subtle text-xs font-medium tracking-wider whitespace-nowrap uppercase",
                      rowPadding,
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
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className="border-border-subtle hover:bg-surface/60 data-[state=selected]:bg-brand-primary/5 border-b last:border-b-0"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={cn("text-foreground text-sm", rowPadding)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VirtualizedBody<TData>({
  table,
  density,
  viewportClassName,
}: Readonly<{
  table: TanstackTable<TData>;
  density: Density;
  viewportClassName?: string;
}>) {
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
    <div className="border-border bg-card overflow-hidden rounded-lg border">
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
                role="row"
                data-state={row.getIsSelected() ? "selected" : undefined}
                className="border-border-subtle hover:bg-surface/60 data-[state=selected]:bg-brand-primary/5 absolute left-0 grid w-full border-b"
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
                    className={cn("text-foreground flex items-center text-sm", rowPadding)}
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
}: Readonly<{
  table: TanstackTable<TData>;
  priority: readonly string[];
  enableSelection: boolean;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {table.getRowModel().rows.map((row) => {
        const visibleCells = row.getVisibleCells();
        const cellsById = new Map(visibleCells.map((cell) => [cell.column.id, cell]));
        return (
          <li
            key={row.id}
            data-slot="data-table-card"
            data-state={row.getIsSelected() ? "selected" : undefined}
            className="border-border bg-card data-[state=selected]:border-brand-primary/60 data-[state=selected]:bg-brand-primary/5 flex flex-col gap-2 rounded-lg border p-3"
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

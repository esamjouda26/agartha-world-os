"use client";

import * as React from "react";
import {
  AlertTriangle,
  DollarSign,
  Truck,
  ShoppingCart,
  PackageMinus,
  Loader2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { FilterChip } from "@/components/ui/filter-chip";

import { createDraftPos } from "@/features/procurement/actions/create-draft-pos";
import type {
  ReorderDashboardData,
  ReorderRow,
} from "@/features/procurement/types";

// ── Props ──────────────────────────────────────────────────────────────

type ReorderDashboardViewProps = Readonly<{
  data: ReorderDashboardData;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * ReorderDashboardView — /management/procurement/reorder
 *
 * Spec: frontend_spec.md §3b `/management/procurement/reorder`
 *   KPI row: "Items below reorder: {n}" | "Estimated order value: ${total}" | "Suppliers affected: {n}"
 *   Data table from single RPC call
 *   Columns: Material, SKU, Category, Default Supplier, 30-Day Usage, On Hand, On Order,
 *            Effective Stock, Reorder Point, Reorder Qty (editable inline)
 *   Checkbox selection per row + "Create Draft POs" action button
 *   Filters: supplier, category, "only below reorder" toggle, search (name + SKU)
 *
 * Workflow: WF-9 Purchase Order Lifecycle — Reorder Dashboard
 */
export function ReorderDashboardView({ data }: ReorderDashboardViewProps) {
  const { rows, locations, categories } = data;

  // ── URL-based filters (same pattern as Route 1) ──────────────
  const supplierFilter = useUrlString("supplier");
  const categoryFilter = useUrlString("category");
  const belowOnlyFilter = useUrlString("belowOnly");
  const searchFilter = useUrlString("q");

  // ── Local state ──────────────────────────────────────────────
  const [reorderAmts, setReorderAmts] = React.useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      for (const r of rows) {
        initial[r.materialId] = r.reorderAmt;
      }
      return initial;
    },
  );

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [locationId, setLocationId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // ── Filter data ────────────────────────────────────────────────
  const filteredRows = React.useMemo(() => {
    let result = [...rows];

    // Supplier filter
    if (supplierFilter.value) {
      result = result.filter(
        (r) => r.defaultSupplierId === supplierFilter.value,
      );
    }

    // Category filter
    if (categoryFilter.value) {
      result = result.filter((r) => r.categoryId === categoryFilter.value);
    }

    // Below reorder only toggle
    if (belowOnlyFilter.value === "1") {
      result = result.filter(
        (r) => (reorderAmts[r.materialId] ?? r.reorderAmt) > 0,
      );
    }

    // Search filter
    const q = searchFilter.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.materialName.toLowerCase().includes(q) ||
          (r.materialSku?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [
    rows,
    supplierFilter.value,
    categoryFilter.value,
    belowOnlyFilter.value,
    searchFilter.value,
    reorderAmts,
  ]);

  const hasActiveFilters = Boolean(
    supplierFilter.value ||
      categoryFilter.value ||
      belowOnlyFilter.value === "1" ||
      searchFilter.value,
  );

  const resetAll = (): void => {
    supplierFilter.set(null);
    categoryFilter.set(null);
    belowOnlyFilter.set(null);
    searchFilter.set(null);
  };

  // ── Filter-reactive KPIs ──────────────────────────────────────
  const filteredKpis = React.useMemo(() => {
    const source = hasActiveFilters ? filteredRows : rows;
    const belowReorder = source.filter(
      (r) => (reorderAmts[r.materialId] ?? r.reorderAmt) > 0,
    );
    const uniqueSuppliers = new Set(
      belowReorder
        .filter((r) => r.defaultSupplierId)
        .map((r) => r.defaultSupplierId),
    );
    const estimatedValue = belowReorder.reduce(
      (sum, r) =>
        sum +
        (reorderAmts[r.materialId] ?? r.reorderAmt) * (r.costPrice ?? 0),
      0,
    );

    return {
      belowReorderCount: belowReorder.length,
      estimatedOrderValue: estimatedValue,
      suppliersAffected: uniqueSuppliers.size,
    };
  }, [filteredRows, rows, reorderAmts, hasActiveFilters]);

  // Rows that need ordering (reorder_amt > 0) from filtered set
  const needsOrdering = React.useMemo(
    () =>
      filteredRows.filter(
        (r) => (reorderAmts[r.materialId] ?? r.reorderAmt) > 0,
      ),
    [filteredRows, reorderAmts],
  );

  // ── Unique supplier list for filter dropdown ───────────────────
  const uniqueSuppliers = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.defaultSupplierId && r.defaultSupplierName) {
        map.set(r.defaultSupplierId, r.defaultSupplierName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  // ── Selection helpers ──────────────────────────────────────────
  const handleReorderAmtChange = (materialId: string, value: string): void => {
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 0) {
      setReorderAmts((prev) => ({ ...prev, [materialId]: num }));
    }
  };

  const toggleRow = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (): void => {
    if (selected.size === needsOrdering.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(needsOrdering.map((r) => r.materialId)));
    }
  };

  const selectedRows = React.useMemo(
    () => rows.filter((r) => selected.has(r.materialId)),
    [rows, selected],
  );

  // Group selected by supplier for dialog preview
  const supplierGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      { supplierName: string; items: ReorderRow[] }
    >();
    for (const r of selectedRows) {
      const key = r.defaultSupplierId ?? "__no_supplier__";
      if (!groups.has(key)) {
        groups.set(key, {
          supplierName: r.defaultSupplierName ?? "No Supplier",
          items: [],
        });
      }
      groups.get(key)!.items.push(r);
    }
    return groups;
  }, [selectedRows]);

  // ── Create Draft POs handler ──────────────────────────────────
  const handleCreateDraftPos = async (): Promise<void> => {
    if (!locationId || selectedRows.length === 0) return;
    setSubmitting(true);
    try {
      const result = await createDraftPos({
        receivingLocationId: locationId,
        items: selectedRows
          .filter((r) => r.defaultSupplierId) // skip rows with no supplier
          .map((r) => ({
            materialId: r.materialId,
            supplierId: r.defaultSupplierId!,
            supplierName: r.defaultSupplierName ?? "",
            orderQty: reorderAmts[r.materialId] ?? r.reorderAmt,
            unitPrice: r.costPrice ?? 0,
          })),
      });

      if (result.success) {
        toastSuccess(
          `Created ${result.data.poIds.length} draft PO${result.data.poIds.length > 1 ? "s" : ""}`,
        );
        setDialogOpen(false);
        setSelected(new Set());
        setLocationId("");
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filter chips ──────────────────────────────────────────────
  const chips: React.ReactNode[] = [];
  if (supplierFilter.value) {
    const name =
      uniqueSuppliers.find(([id]) => id === supplierFilter.value)?.[1] ??
      supplierFilter.value;
    chips.push(
      <FilterChip
        key="supplier"
        name="Supplier"
        label={name}
        onRemove={() => supplierFilter.set(null)}
        data-testid="reorder-filter-chip-supplier"
      />,
    );
  }
  if (categoryFilter.value) {
    const name =
      categories.find((c) => c.id === categoryFilter.value)?.name ??
      categoryFilter.value;
    chips.push(
      <FilterChip
        key="category"
        name="Category"
        label={name}
        onRemove={() => categoryFilter.set(null)}
        data-testid="reorder-filter-chip-category"
      />,
    );
  }
  if (belowOnlyFilter.value === "1") {
    chips.push(
      <FilterChip
        key="belowOnly"
        name="Status"
        label="Below reorder only"
        onRemove={() => belowOnlyFilter.set(null)}
        data-testid="reorder-filter-chip-below"
      />,
    );
  }

  // ── Columns (ColumnDef — matches Route 1 pattern) ─────────────
  const columns = React.useMemo<ColumnDef<ReorderRow, unknown>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={
              needsOrdering.length > 0 &&
              selected.size === needsOrdering.length
            }
            onCheckedChange={toggleAll}
            aria-label="Select all"
            data-testid="reorder-select-all"
          />
        ),
        cell: ({ row }) => {
          const amt =
            reorderAmts[row.original.materialId] ?? row.original.reorderAmt;
          if (amt <= 0) return <span className="block size-4" />;
          return (
            <Checkbox
              checked={selected.has(row.original.materialId)}
              onCheckedChange={() => toggleRow(row.original.materialId)}
              aria-label={`Select ${row.original.materialName}`}
            />
          );
        },
        meta: {
          headerClassName: "w-0",
          cellClassName: "w-0",
        },
      },
      {
        id: "materialName",
        accessorKey: "materialName",
        header: "Material",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.materialName}
          </span>
        ),
      },
      {
        id: "materialSku",
        accessorKey: "materialSku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-sm">
            {row.original.materialSku ?? "—"}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "categoryName",
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => row.original.categoryName ?? "—",
      },
      {
        id: "defaultSupplier",
        accessorKey: "defaultSupplierName",
        header: "Default Supplier",
        cell: ({ row }) =>
          row.original.defaultSupplierName ?? (
            <StatusBadge
              status="none"
              tone="warning"
              label="No supplier"
              data-testid="reorder-no-supplier-badge"
            />
          ),
      },
      {
        id: "sellThrough30d",
        accessorKey: "sellThrough30d",
        header: "30d Usage",
        cell: ({ row }) => (
          <span className="text-foreground-muted tabular-nums">
            {row.original.sellThrough30d.toLocaleString()}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "onHand",
        accessorKey: "onHand",
        header: "On Hand",
        cell: ({ row }) => {
          const r = row.original;
          const isLow = r.effectiveStock <= r.reorderPoint;
          return (
            <span
              className={
                isLow
                  ? "text-status-danger-foreground font-semibold tabular-nums"
                  : "text-foreground-muted tabular-nums"
              }
            >
              {r.onHand.toLocaleString()}
              {isLow && (
                <AlertTriangle
                  aria-label="Below reorder point"
                  className="ml-1 inline-block size-3.5"
                />
              )}
            </span>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "onOrder",
        accessorKey: "onOrder",
        header: "On Order",
        cell: ({ row }) => (
          <span className="text-foreground-muted tabular-nums">
            {row.original.onOrder.toLocaleString()}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "effectiveStock",
        accessorKey: "effectiveStock",
        header: "Effective",
        cell: ({ row }) => {
          const r = row.original;
          const isLow = r.effectiveStock <= r.reorderPoint;
          return (
            <span
              className={
                isLow
                  ? "text-status-danger-foreground font-semibold tabular-nums"
                  : "text-foreground-muted tabular-nums"
              }
            >
              {r.effectiveStock.toLocaleString()}
            </span>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "reorderPoint",
        accessorKey: "reorderPoint",
        header: "Reorder Pt",
        cell: ({ row }) => (
          <span className="text-foreground-muted tabular-nums">
            {row.original.reorderPoint.toLocaleString()}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "reorderQty",
        accessorKey: "reorderAmt",
        header: "Order Qty",
        cell: ({ row }) => {
          const r = row.original;
          const amt = reorderAmts[r.materialId] ?? r.reorderAmt;
          return (
            <Input
              type="number"
              min={0}
              value={amt}
              onChange={(e) =>
                handleReorderAmtChange(r.materialId, e.target.value)
              }
              className="h-7 w-20 text-right tabular-nums"
              data-testid={`reorder-qty-${r.materialId}`}
            />
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reorderAmts, selected, needsOrdering],
  );

  // Items with no supplier warning
  const noSupplierSelectedCount = selectedRows.filter(
    (r) => !r.defaultSupplierId,
  ).length;

  return (
    <div className="flex flex-col gap-6" data-testid="reorder-dashboard">
      <PageHeader
        title="Reorder Dashboard"
        description="Stock levels vs reorder points — create draft POs for materials below threshold."
        data-testid="reorder-header"
        primaryAction={
          selected.size > 0 ? (
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              data-testid="reorder-create-draft-pos"
            >
              <ShoppingCart aria-hidden className="size-4" />
              Create Draft POs ({selected.size})
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<ReorderRow>
        kpis={
          <KpiCardRow data-testid="reorder-kpis">
            <KpiCard
              label="Items Below Reorder"
              value={filteredKpis.belowReorderCount}
              caption="below threshold"
              icon={<AlertTriangle aria-hidden className="size-4" />}
              {...(filteredKpis.belowReorderCount > 0
                ? {
                    trend: {
                      direction: "up" as const,
                      label: `${filteredKpis.belowReorderCount} items`,
                      goodWhen: "down" as const,
                    },
                  }
                : {})}
              data-testid="reorder-kpi-below"
            />
            <KpiCard
              label="Estimated Order Value"
              value={`$${filteredKpis.estimatedOrderValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              caption="total cost at default pricing"
              icon={<DollarSign aria-hidden className="size-4" />}
              data-testid="reorder-kpi-value"
            />
            <KpiCard
              label="Suppliers Affected"
              value={filteredKpis.suppliersAffected}
              caption="with items below threshold"
              icon={<Truck aria-hidden className="size-4" />}
              data-testid="reorder-kpi-suppliers"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="reorder-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by name or SKU…"
                aria-label="Search materials"
                debounceMs={300}
                data-testid="reorder-search"
              />
            }
            controls={
              <>
                <Select
                  value={supplierFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    supplierFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Default Supplier"
                    data-testid="reorder-filter-supplier"
                  >
                    <SelectValue placeholder="Any supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any supplier</SelectItem>
                    {uniqueSuppliers.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    categoryFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Category"
                    data-testid="reorder-filter-category"
                  >
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label
                  className="flex items-center gap-2 whitespace-nowrap text-sm"
                  data-testid="reorder-filter-below-toggle"
                >
                  <Switch
                    checked={belowOnlyFilter.value === "1"}
                    onCheckedChange={(checked) =>
                      belowOnlyFilter.set(checked ? "1" : null)
                    }
                    aria-label="Show only items below reorder point"
                  />
                  Below reorder only
                </label>
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: [
            "materialName",
            "onHand",
            "effectiveStock",
            "reorderQty",
          ],
          getRowId: (row) => row.materialId,
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: "No materials match your filters",
          description: "Clear filters or try a different search.",
          icon: <PackageMinus className="size-8" />,
        }}
        data-testid="reorder-materials-table"
      />

      {/* ── Create Draft POs Dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="reorder-create-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart aria-hidden className="size-4" />
              Create Draft Purchase Orders
            </DialogTitle>
            <DialogDescription>
              {supplierGroups.size} draft PO
              {supplierGroups.size > 1 ? "s" : ""} will be created, grouped by
              default supplier.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* No-supplier warning */}
            {noSupplierSelectedCount > 0 && (
              <div className="bg-status-warning-subtle text-status-warning-foreground rounded-lg p-3 text-sm">
                <AlertTriangle className="mr-1 inline-block size-3.5" />
                {noSupplierSelectedCount} selected item
                {noSupplierSelectedCount > 1 ? "s" : ""} ha
                {noSupplierSelectedCount > 1 ? "ve" : "s"} no default supplier
                and will be skipped.
              </div>
            )}

            {/* Location selector */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reorder-location">Receiving Location *</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger
                  id="reorder-location"
                  data-testid="reorder-location-select"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary per supplier */}
            <div className="border-border-subtle divide-border-subtle divide-y rounded-lg border">
              {Array.from(supplierGroups.entries()).map(([key, group]) => (
                <div key={key} className="flex flex-col gap-1 px-3 py-2">
                  <span className="text-foreground text-sm font-medium">
                    {group.supplierName}
                  </span>
                  <span className="text-foreground-muted text-xs">
                    {group.items.length} item
                    {group.items.length > 1 ? "s" : ""} ·{" "}
                    {group.items.map((i) => i.materialName).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!locationId || submitting}
              onClick={handleCreateDraftPos}
              data-testid="reorder-confirm-create"
            >
              {submitting && (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              )}
              Create {supplierGroups.size} Draft PO
              {supplierGroups.size > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

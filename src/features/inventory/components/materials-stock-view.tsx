"use client";

import * as React from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  CircleSlash,
  Wallet,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { StatusBadge } from "@/components/ui/status-badge";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import {
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABELS,
  VALUATION_METHOD_LABELS,
  type MaterialTypeValue,
} from "@/features/inventory/constants";
import type {
  MaterialStockListData,
  MaterialStockRow,
} from "@/features/inventory/types";

const CURRENCY = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

const QTY = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 2,
});

type MaterialsStockViewProps = Readonly<{
  data: MaterialStockListData;
}>;

export function MaterialsStockView({ data }: MaterialsStockViewProps) {
  const typeFilter = useUrlString("type");
  const categoryFilter = useUrlString("category");
  const locationFilter = useUrlString("location");
  const searchFilter = useUrlString("q");

  const filteredRows = React.useMemo(() => {
    let result = [...data.rows];

    if (typeFilter.value) {
      result = result.filter((m) => m.materialType === typeFilter.value);
    }
    if (categoryFilter.value) {
      result = result.filter((m) => m.categoryId === categoryFilter.value);
    }
    if (locationFilter.value) {
      const locId = locationFilter.value;
      result = result.filter((m) =>
        m.byLocation.some((b) => b.locationId === locId),
      );
    }
    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.sku?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [
    data.rows,
    typeFilter.value,
    categoryFilter.value,
    locationFilter.value,
    searchFilter.value,
  ]);

  const hasActiveFilters = Boolean(
    typeFilter.value ||
      categoryFilter.value ||
      locationFilter.value ||
      searchFilter.value,
  );

  const resetAll = (): void => {
    typeFilter.set(null);
    categoryFilter.set(null);
    locationFilter.set(null);
    searchFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (typeFilter.value) {
    chips.push(
      <FilterChip
        key="type"
        name="Type"
        label={
          MATERIAL_TYPE_LABELS[typeFilter.value as MaterialTypeValue] ??
          typeFilter.value
        }
        onRemove={() => typeFilter.set(null)}
        data-testid="inventory-filter-chip-type"
      />,
    );
  }
  if (categoryFilter.value) {
    const catName = data.categories.find(
      (c) => c.id === categoryFilter.value,
    )?.name;
    chips.push(
      <FilterChip
        key="category"
        name="Category"
        label={catName ?? categoryFilter.value}
        onRemove={() => categoryFilter.set(null)}
        data-testid="inventory-filter-chip-category"
      />,
    );
  }
  if (locationFilter.value) {
    const locName = data.locations.find(
      (l) => l.id === locationFilter.value,
    )?.name;
    chips.push(
      <FilterChip
        key="location"
        name="Location"
        label={locName ?? locationFilter.value}
        onRemove={() => locationFilter.set(null)}
        data-testid="inventory-filter-chip-location"
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<MaterialStockRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Material",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ChevronDown
              aria-hidden
              className={
                row.getIsExpanded()
                  ? "text-foreground-muted size-4"
                  : "text-foreground-muted size-4 -rotate-90 transition-transform"
              }
            />
            <span className="text-foreground font-medium">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        id: "sku",
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-sm">
            {row.original.sku ?? "—"}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "materialType",
        accessorKey: "materialType",
        header: "Type",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.materialType}
            label={
              MATERIAL_TYPE_LABELS[row.original.materialType] ??
              row.original.materialType
            }
            variant="outline"
            tone="neutral"
            data-testid="inventory-row-type"
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "category",
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => row.original.categoryName ?? "—",
      },
      {
        id: "baseUnit",
        accessorKey: "baseUnitAbbreviation",
        header: "Unit",
        cell: ({ row }) => row.original.baseUnitAbbreviation ?? "—",
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "onHand",
        accessorKey: "onHand",
        header: "On Hand",
        cell: ({ row }) => {
          const m = row.original;
          const danger = m.reorderPoint > 0 && m.onHand <= m.reorderPoint;
          return (
            <span
              className={
                danger
                  ? "text-status-danger-foreground font-semibold tabular-nums"
                  : "text-foreground tabular-nums"
              }
            >
              {QTY.format(m.onHand)}
              {danger ? (
                <AlertTriangle
                  aria-label="At or below reorder point"
                  className="ml-1 inline-block size-3.5"
                />
              ) : null}
            </span>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "valuationMethod",
        accessorKey: "valuationMethod",
        header: "Valuation",
        cell: ({ row }) =>
          VALUATION_METHOD_LABELS[row.original.valuationMethod] ??
          row.original.valuationMethod,
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "active" : "inactive"}
            variant="dot"
            data-testid="inventory-row-active"
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [],
  );

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="inventory-materials-stock-list"
    >
      <PageHeader
        title="Materials & Stock"
        description="Master material registry with on-hand stock balance per location."
        data-testid="inventory-materials-stock-header"
      />

      <FilterableDataTable<MaterialStockRow>
        kpis={
          <KpiCardRow data-testid="inventory-materials-stock-kpis">
            <KpiCard
              label="Active SKUs"
              value={QTY.format(data.kpis.activeSkusCount)}
              caption="materials with is_active = true"
              icon={<Boxes aria-hidden className="size-4" />}
              data-testid="inventory-kpi-active-skus"
            />
            <KpiCard
              label="Zero Stock"
              value={QTY.format(data.kpis.zeroStockCount)}
              caption="no balance recorded"
              icon={<CircleSlash aria-hidden className="size-4" />}
              data-testid="inventory-kpi-zero-stock"
            />
            <KpiCard
              label="Below Reorder"
              value={QTY.format(data.kpis.belowReorderCount)}
              caption="at or under reorder point"
              icon={<AlertTriangle aria-hidden className="size-4" />}
              {...(data.kpis.belowReorderCount > 0
                ? {
                    trend: {
                      direction: "up" as const,
                      label: `${data.kpis.belowReorderCount} items`,
                      goodWhen: "down" as const,
                    },
                  }
                : {})}
              data-testid="inventory-kpi-below-reorder"
            />
            <KpiCard
              label="Total Inventory Value"
              value={CURRENCY.format(data.kpis.totalInventoryValue)}
              caption="sum of stock_value"
              icon={<Wallet aria-hidden className="size-4" />}
              data-testid="inventory-kpi-total-value"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="inventory-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by name or SKU…"
                aria-label="Search materials"
                debounceMs={300}
                data-testid="inventory-search"
              />
            }
            controls={
              <>
                <Select
                  value={typeFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    typeFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Material Type"
                    data-testid="inventory-filter-type"
                  >
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any type</SelectItem>
                    {MATERIAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {MATERIAL_TYPE_LABELS[t]}
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
                    data-testid="inventory-filter-category"
                  >
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any category</SelectItem>
                    {data.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={locationFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    locationFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Location"
                    data-testid="inventory-filter-location"
                  >
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any location</SelectItem>
                    {data.locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: ["name", "materialType", "onHand", "isActive"],
          getRowId: (row) => row.id,
          renderSubComponent: (row) => (
            <StockByLocationGrid row={row.original} />
          ),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: hasActiveFilters
            ? "No materials match your filters"
            : "No materials yet",
          description: hasActiveFilters
            ? "Clear filters or try a different search."
            : "Materials are managed under /management/procurement.",
          icon: <Boxes className="size-8" />,
        }}
        data-testid="inventory-materials-stock-table"
      />
    </div>
  );
}

// ── Sub-component: per-location stock grid for the expanded row ──────────

function StockByLocationGrid({
  row,
}: Readonly<{ row: MaterialStockRow }>) {
  if (row.byLocation.length === 0) {
    return (
      <div
        className="bg-surface/40 text-foreground-muted px-4 py-3 text-sm"
        data-testid="inventory-stock-by-location-empty"
      >
        No stock balance recorded for this material yet.
      </div>
    );
  }
  return (
    <div
      className="bg-surface/40 px-4 py-3"
      data-testid="inventory-stock-by-location"
    >
      <table className="w-full text-sm">
        <thead className="text-foreground-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="py-1 text-left font-medium">Location</th>
            <th className="py-1 text-right font-medium">On Hand</th>
            <th className="py-1 text-right font-medium">Stock Value</th>
          </tr>
        </thead>
        <tbody>
          {row.byLocation.map((b) => (
            <tr
              key={b.locationId}
              className="border-border-subtle border-t"
              data-testid="inventory-stock-by-location-row"
            >
              <td className="py-1.5">{b.locationName}</td>
              <td className="py-1.5 text-right tabular-nums">
                {QTY.format(b.currentQty)}{" "}
                <span className="text-foreground-muted">
                  {row.baseUnitAbbreviation ?? ""}
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {CURRENCY.format(b.stockValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

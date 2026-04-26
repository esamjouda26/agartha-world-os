"use client";

import * as React from "react";
import { Wallet, MapPin, Package, Boxes } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { useUrlString } from "@/components/shared/url-state-helpers";

import type {
  MaterialType,
  ValuationListData,
  ValuationListRow,
} from "@/features/inventory/types";
import {
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABELS,
} from "@/features/inventory/constants";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });
const CURRENCY = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 2,
});
const CURRENCY_COMPACT = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

type Props = Readonly<{
  data: ValuationListData;
}>;

export function ValuationView({ data }: Props) {
  const locationFilter = useUrlString("location");
  const materialTypeFilter = useUrlString("material_type");

  const selectedTypes = React.useMemo<ReadonlyArray<MaterialType>>(() => {
    if (!materialTypeFilter.value) return [];
    return materialTypeFilter.value
      .split(",")
      .filter((t): t is MaterialType =>
        (MATERIAL_TYPES as readonly string[]).includes(t),
      );
  }, [materialTypeFilter.value]);

  const hasActiveFilters = Boolean(
    locationFilter.value || selectedTypes.length > 0,
  );

  const resetAll = (): void => {
    locationFilter.set(null);
    materialTypeFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (locationFilter.value) {
    const loc = data.locations.find((l) => l.id === locationFilter.value);
    chips.push(
      <FilterChip
        key="location"
        name="Location"
        label={loc?.name ?? locationFilter.value}
        onRemove={() => locationFilter.set(null)}
        data-testid="inventory-valuation-chip-location"
      />,
    );
  }
  for (const t of selectedTypes) {
    chips.push(
      <FilterChip
        key={`type-${t}`}
        name="Material type"
        label={MATERIAL_TYPE_LABELS[t]}
        onRemove={() => {
          const next = selectedTypes.filter((x) => x !== t);
          materialTypeFilter.set(next.length > 0 ? next.join(",") : null);
        }}
        data-testid={`inventory-valuation-chip-type-${t}`}
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<ValuationListRow, unknown>[]>(
    () => [
      {
        id: "material",
        header: "Material",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.materialName}
          </span>
        ),
      },
      {
        id: "materialType",
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
            data-testid={`inventory-valuation-row-type-${row.original.rowId}`}
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => row.original.locationName,
      },
      {
        id: "standardCost",
        header: "Standard",
        cell: ({ row }) =>
          row.original.standardCost === null ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <span className="tabular-nums">
              {CURRENCY.format(row.original.standardCost)}
            </span>
          ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "movingAvgCost",
        header: "Moving avg",
        cell: ({ row }) =>
          row.original.movingAvgCost === null ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <span className="tabular-nums">
              {CURRENCY.format(row.original.movingAvgCost)}
            </span>
          ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "lastPurchaseCost",
        header: "Last purchase",
        cell: ({ row }) =>
          row.original.lastPurchaseCost === null ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <span className="tabular-nums">
              {CURRENCY.format(row.original.lastPurchaseCost)}
            </span>
          ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "currentQty",
        header: "On hand",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {QTY.format(row.original.currentQty)}
            {row.original.baseUnitAbbreviation ? (
              <span className="text-foreground-muted ml-1">
                {row.original.baseUnitAbbreviation}
              </span>
            ) : null}
          </span>
        ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "stockValue",
        header: "Stock value",
        cell: ({ row }) => (
          <span className="text-foreground tabular-nums font-medium">
            {CURRENCY.format(row.original.stockValue)}
          </span>
        ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="inventory-valuation-view">
      <PageHeader
        title="Material Valuation"
        description="Cost analysis per material per location — standard, moving-average, and last-purchase cost basis."
        data-testid="inventory-valuation-header"
      />

      <KpiCardRow data-testid="inventory-valuation-kpis">
        <KpiCard
          label="Total inventory value"
          value={CURRENCY_COMPACT.format(data.kpis.totalInventoryValue)}
          caption={
            data.rows.length === 0
              ? "no data in current filter"
              : `${QTY.format(data.rows.length)} valuation row${data.rows.length === 1 ? "" : "s"}`
          }
          icon={<Wallet aria-hidden className="size-4" />}
          data-testid="inventory-valuation-kpi-total"
        />
        <KpiCard
          label="Highest-value location"
          value={data.kpis.highestValueLocation?.name ?? "—"}
          caption={
            data.kpis.highestValueLocation
              ? CURRENCY_COMPACT.format(data.kpis.highestValueLocation.value)
              : "no rows"
          }
          icon={<MapPin aria-hidden className="size-4" />}
          data-testid="inventory-valuation-kpi-top-location"
        />
        <KpiCard
          label="Highest-value SKU"
          value={data.kpis.highestValueSku?.name ?? "—"}
          caption={
            data.kpis.highestValueSku
              ? CURRENCY_COMPACT.format(data.kpis.highestValueSku.value)
              : "no rows"
          }
          icon={<Package aria-hidden className="size-4" />}
          data-testid="inventory-valuation-kpi-top-sku"
        />
      </KpiCardRow>

      <FilterableDataTable<ValuationListRow>
        toolbar={
          <FilterBar
            data-testid="inventory-valuation-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            controls={
              <>
                <Select
                  value={locationFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    locationFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Location"
                    data-testid="inventory-valuation-filter-location"
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
                <MultiSelect
                  value={selectedTypes as string[]}
                  onChange={(next) =>
                    materialTypeFilter.set(
                      next.length === 0 ? null : next.join(","),
                    )
                  }
                  options={MATERIAL_TYPES.map((t) => ({
                    value: t,
                    label: MATERIAL_TYPE_LABELS[t],
                  }))}
                  placeholder="Any material type"
                  searchPlaceholder="Search types…"
                  className="h-10 min-w-[12rem] sm:w-auto"
                  data-testid="inventory-valuation-filter-type"
                />
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: data.rows,
          columns,
          mobileFieldPriority: [
            "material",
            "location",
            "currentQty",
            "stockValue",
          ],
          getRowId: (row) => row.rowId,
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: hasActiveFilters
            ? "No valuation rows match your filters"
            : "No valuation data yet",
          description: hasActiveFilters
            ? "Clear filters or pick a different location."
            : "Valuation rows are populated as goods movements settle.",
          icon: <Boxes className="size-8" />,
        }}
        data-testid="inventory-valuation-table"
      />
    </div>
  );
}

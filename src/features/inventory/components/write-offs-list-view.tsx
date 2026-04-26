"use client";

import * as React from "react";
import type { Route } from "next";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Trash2,
  AlertTriangle,
  Package,
  Camera,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
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
import { SearchableSelect } from "@/components/ui/searchable-select";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { CursorPagination } from "@/components/shared/cursor-pagination";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  DisposalReason,
  WriteOffListData,
  WriteOffListRow,
} from "@/features/inventory/types";
import {
  DISPOSAL_REASON_OPTIONS,
  WRITE_OFFS_DEFAULT_PAGE_SIZE,
  WRITE_OFFS_PAGE_SIZE_OPTIONS,
} from "@/features/inventory/constants";
import { markWriteOffReviewed } from "@/features/inventory/actions/mark-write-off-reviewed";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });
const CURRENCY = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

const REASON_LABEL: Record<DisposalReason, string> = {
  expired: "Expired",
  damaged: "Damaged",
  contaminated: "Contaminated",
  preparation_error: "Prep Error",
  overproduction: "Overproduction",
  quality_defect: "Quality Defect",
};

const REASON_TONE: Record<
  DisposalReason,
  "danger" | "warning" | "neutral" | "info"
> = {
  expired: "warning",
  damaged: "warning",
  contaminated: "danger",
  preparation_error: "neutral",
  overproduction: "info",
  quality_defect: "danger",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = Readonly<{
  data: WriteOffListData;
  /** When false, the per-row "Mark reviewed" button is hidden. */
  canReview: boolean;
}>;

export function WriteOffsListView({ data, canReview }: Props) {
  const router = useRouter();
  const reviewedFilter = useUrlString("reviewed");
  const reasonFilter = useUrlString("reason");
  const materialFilter = useUrlString("material");
  const locationFilter = useUrlString("location");
  const fromFilter = useUrlString("from");
  const toFilter = useUrlString("to");

  const reviewedValue = reviewedFilter.value ?? "unreviewed";

  const [pendingMarkId, setPendingMarkId] = React.useState<string | null>(null);

  const handleMark = async (id: string): Promise<void> => {
    setPendingMarkId(id);
    try {
      const result = await markWriteOffReviewed({ writeOffId: id });
      if (result.success) {
        toastSuccess("Marked reviewed");
        router.refresh();
      } else {
        toastError(result);
      }
    } finally {
      setPendingMarkId(null);
    }
  };

  const hasActiveFilters = Boolean(
    reasonFilter.value ||
      materialFilter.value ||
      locationFilter.value ||
      fromFilter.value ||
      toFilter.value ||
      reviewedFilter.value, // explicit non-default
  );

  const resetAll = (): void => {
    reviewedFilter.set(null);
    reasonFilter.set(null);
    materialFilter.set(null);
    locationFilter.set(null);
    fromFilter.set(null);
    toFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (reviewedFilter.value && reviewedFilter.value !== "unreviewed") {
    chips.push(
      <FilterChip
        key="reviewed"
        name="Reviewed state"
        label={reviewedFilter.value === "reviewed" ? "Reviewed only" : "All"}
        onRemove={() => reviewedFilter.set(null)}
        data-testid="inventory-write-offs-chip-reviewed"
      />,
    );
  }
  if (reasonFilter.value) {
    const r = reasonFilter.value as DisposalReason;
    chips.push(
      <FilterChip
        key="reason"
        name="Reason"
        label={REASON_LABEL[r] ?? reasonFilter.value}
        onRemove={() => reasonFilter.set(null)}
        data-testid="inventory-write-offs-chip-reason"
      />,
    );
  }
  if (materialFilter.value) {
    const m = data.materials.find((x) => x.id === materialFilter.value);
    chips.push(
      <FilterChip
        key="material"
        name="Material"
        label={m?.name ?? materialFilter.value}
        onRemove={() => materialFilter.set(null)}
        data-testid="inventory-write-offs-chip-material"
      />,
    );
  }
  if (locationFilter.value) {
    const l = data.locations.find((x) => x.id === locationFilter.value);
    chips.push(
      <FilterChip
        key="location"
        name="Location"
        label={l?.name ?? locationFilter.value}
        onRemove={() => locationFilter.set(null)}
        data-testid="inventory-write-offs-chip-location"
      />,
    );
  }
  if (fromFilter.value || toFilter.value) {
    const label =
      fromFilter.value && toFilter.value
        ? `${fromFilter.value} → ${toFilter.value}`
        : fromFilter.value
          ? `After ${fromFilter.value}`
          : `Before ${toFilter.value}`;
    chips.push(
      <FilterChip
        key="date"
        name="Created"
        label={label}
        onRemove={() => {
          fromFilter.set(null);
          toFilter.set(null);
        }}
        data-testid="inventory-write-offs-chip-date"
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<WriteOffListRow, unknown>[]>(
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
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {QTY.format(row.original.quantity)}
            {row.original.baseUnitAbbreviation ? (
              <span className="text-foreground-muted ml-1">
                {row.original.baseUnitAbbreviation}
              </span>
            ) : null}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.reason}
            tone={REASON_TONE[row.original.reason]}
            label={REASON_LABEL[row.original.reason] ?? row.original.reason}
            variant="outline"
            data-testid={`inventory-write-offs-row-reason-${row.original.id}`}
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
        id: "disposedBy",
        header: "Disposed by",
        cell: ({ row }) => row.original.disposedByName ?? "—",
      },
      {
        id: "totalCost",
        header: "Cost",
        cell: ({ row }) => (
          <span className="text-foreground-muted tabular-nums">
            {CURRENCY.format(row.original.totalCost)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "photo",
        header: () => <span className="sr-only">Photo</span>,
        cell: ({ row }) =>
          row.original.hasPhoto ? (
            <Camera
              aria-label="Photo proof attached"
              className="text-foreground-muted size-4"
              data-testid={`inventory-write-offs-row-photo-${row.original.id}`}
            />
          ) : null,
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatTimestamp(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "reviewed",
        header: "Reviewed",
        cell: ({ row }) =>
          row.original.reviewedAt ? (
            <span className="text-foreground-muted text-sm">
              <CheckCircle2
                aria-hidden
                className="text-status-success-foreground mr-1 inline-block size-3.5"
              />
              {row.original.reviewedByName ?? "Reviewer"}
            </span>
          ) : (
            <StatusBadge
              status="warning"
              tone="warning"
              label="Unreviewed"
              variant="outline"
              data-testid={`inventory-write-offs-row-unreviewed-${row.original.id}`}
            />
          ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          if (row.original.reviewedAt) return null;
          if (!canReview) return null;
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pendingMarkId === row.original.id}
              onClick={(e) => {
                e.stopPropagation();
                void handleMark(row.original.id);
              }}
              data-testid={`inventory-write-offs-row-mark-reviewed-${row.original.id}`}
            >
              Mark reviewed
            </Button>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [canReview, pendingMarkId],
  );

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="inventory-write-offs-list"
    >
      <PageHeader
        title="Write-Offs"
        description="Review crew-submitted disposals. New disposals are entered at /crew/disposals."
        data-testid="inventory-write-offs-header"
        primaryAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            data-testid="inventory-write-offs-link-crew-disposals"
          >
            <Link href={"/crew/disposals" as Route}>
              <ExternalLink aria-hidden className="size-4" /> Crew disposals
            </Link>
          </Button>
        }
      />

      <KpiCardRow data-testid="inventory-write-offs-kpis">
        <KpiCard
          label="Unreviewed"
          value={QTY.format(data.kpis.unreviewedCount)}
          caption="awaiting review"
          icon={<AlertTriangle aria-hidden className="size-4" />}
          {...(data.kpis.unreviewedCount > 0
            ? {
                trend: {
                  direction: "up" as const,
                  label: "queue depth",
                  goodWhen: "down" as const,
                },
              }
            : {})}
          data-testid="inventory-write-offs-kpi-unreviewed"
        />
        <KpiCard
          label="Total waste"
          value={QTY.format(data.kpis.totalWasteQty)}
          caption={`${data.kpis.periodStart} → ${data.kpis.periodEnd}`}
          icon={<Trash2 aria-hidden className="size-4" />}
          data-testid="inventory-write-offs-kpi-total-waste"
        />
        <KpiCard
          label="Top reason"
          value={
            data.kpis.topReason
              ? REASON_LABEL[data.kpis.topReason]
              : "—"
          }
          caption={
            data.kpis.topReason
              ? `${QTY.format(data.kpis.topReasonCount)} entries`
              : "no data in period"
          }
          icon={<Package aria-hidden className="size-4" />}
          data-testid="inventory-write-offs-kpi-top-reason"
        />
        <KpiCard
          label="Estimated cost"
          value={CURRENCY.format(data.kpis.estimatedCost)}
          caption="this period"
          data-testid="inventory-write-offs-kpi-cost"
        />
      </KpiCardRow>

      <FilterableDataTable<WriteOffListRow>
        toolbar={
          <FilterBar
            data-testid="inventory-write-offs-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            controls={
              <>
                <Select
                  value={reviewedValue}
                  onValueChange={(next) =>
                    reviewedFilter.set(next === "unreviewed" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Reviewed state"
                    data-testid="inventory-write-offs-filter-reviewed"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unreviewed">Unreviewed</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={reasonFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    reasonFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Reason"
                    data-testid="inventory-write-offs-filter-reason"
                  >
                    <SelectValue placeholder="Any reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any reason</SelectItem>
                    {DISPOSAL_REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SearchableSelect
                  value={materialFilter.value}
                  onChange={(v) => materialFilter.set(v)}
                  options={data.materials.map((m) => ({
                    value: m.id,
                    label: m.sku ? `${m.name} (${m.sku})` : m.name,
                  }))}
                  placeholder="Any material"
                  searchPlaceholder="Search materials…"
                  className="h-10 min-w-[14rem] sm:w-auto"
                  data-testid="inventory-write-offs-filter-material"
                />
                <Select
                  value={locationFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    locationFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Location"
                    data-testid="inventory-write-offs-filter-location"
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
                <UrlDateRangePicker
                  fromParam="from"
                  toParam="to"
                  className="min-w-[16rem] sm:w-auto"
                  data-testid="inventory-write-offs-filter-date"
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
            "quantity",
            "reason",
            "reviewed",
          ],
          getRowId: (row) => row.id,
        }}
        pagination={
          <CursorPagination
            nextCursorToken={data.nextCursor}
            pageSizeOptions={WRITE_OFFS_PAGE_SIZE_OPTIONS}
            defaultPageSize={WRITE_OFFS_DEFAULT_PAGE_SIZE}
            data-testid="inventory-write-offs-pagination"
          />
        }
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: hasActiveFilters
            ? "No write-offs match your filters"
            : "No unreviewed write-offs",
          description: hasActiveFilters
            ? "Clear filters or try a different range."
            : "Crew disposals will appear here as they are submitted.",
          icon: <Trash2 className="size-8" />,
        }}
        data-testid="inventory-write-offs-table"
      />
    </div>
  );
}

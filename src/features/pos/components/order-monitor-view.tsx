"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, ExpandedState, Row } from "@tanstack/react-table";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { CursorPagination } from "@/components/shared/cursor-pagination";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetadataList } from "@/components/ui/metadata-list";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { OrdersData, OrderRow } from "@/features/pos/types/management";
import { cancelOrder } from "@/features/pos/actions/cancel-order";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatCents } from "@/lib/money";
import { ACTIVE_ORDERS_QUERY_KEY } from "@/features/pos/queries/active-orders-query";

// ── Constants ────────────────────────────────────────────────────────────

const STATUS_PARAM = "status";
const POS_POINT_PARAM = "pp";
const DATE_FROM_PARAM = "from";
const DATE_TO_PARAM = "to";
const SEARCH_PARAM = "q";

const MOBILE_COLS = ["shortId", "posPointName", "totalAmount", "status"] as const;

// ── Formatters ───────────────────────────────────────────────────────────

function formatPrepTime(seconds: number): string {
  if (seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}

// ── Props ────────────────────────────────────────────────────────────────

type OrderMonitorViewProps = Readonly<{
  initialData: OrdersData & { nextCursorToken: string | null };
  canCancel: boolean;
}>;

// ── Elapsed timer for preparing orders ───────────────────────────────────

function useElapsed(createdAt: string): string {
  const [label, setLabel] = React.useState(() =>
    formatDistanceToNow(parseISO(createdAt), { addSuffix: false }),
  );
  React.useEffect(() => {
    const id = setInterval(() => {
      setLabel(formatDistanceToNow(parseISO(createdAt), { addSuffix: false }));
    }, 30_000);
    return () => clearInterval(id);
  }, [createdAt]);
  return label;
}

function ElapsedCell({ createdAt }: Readonly<{ createdAt: string }>) {
  const label = useElapsed(createdAt);
  return <span>{label}</span>;
}

// ── Expanded row sub-component ────────────────────────────────────────────

function OrderExpandedRow({ order }: Readonly<{ order: OrderRow }>) {
  return (
    <div className="px-4 py-3" data-testid={`order-expanded-${order.id}`}>
      <MetadataList
        layout="grid"
        items={[
          { label: "Payment method", value: order.paymentMethod ?? "—" },
          { label: "Items", value: order.itemCount },
          { label: "Created", value: new Date(order.createdAt).toLocaleTimeString() },
          ...(order.completedAt
            ? [{ label: "Completed", value: new Date(order.completedAt).toLocaleTimeString() }]
            : []),
        ]}
      />
      <ul className="mt-3 space-y-1">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-medium">
              {item.quantity}× {item.materialName}
            </span>
            {item.modifiers.length > 0 && (
              <span className="text-foreground-muted ml-1">
                ({item.modifiers.map((m) => m.optionName).join(", ")})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────

type OrderStatus = "preparing" | "completed" | "cancelled";
const STATUS_VALUES: readonly OrderStatus[] = ["preparing", "completed", "cancelled"];

export function OrderMonitorView({ initialData, canCancel }: OrderMonitorViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Single source of truth for the active tab — read directly from the URL
  // so the StatusTabBar (controlled internally via paramKey + shallow:false)
  // stays in sync with the rest of the view.
  const statusFilter = useUrlString(STATUS_PARAM);
  const status: OrderStatus = (STATUS_VALUES as readonly string[]).includes(
    statusFilter.value ?? "",
  )
    ? (statusFilter.value as OrderStatus)
    : "preparing";

  const posPointFilter = useUrlString(POS_POINT_PARAM);
  const search = useUrlString(SEARCH_PARAM);
  const dateFromFilter = useUrlString(DATE_FROM_PARAM);
  const dateToFilter = useUrlString(DATE_TO_PARAM);
  const [cancelTarget, setCancelTarget] = React.useState<OrderRow | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  // KPI scope label: when no date range in URL → "today" (matches the
  // server-side default in get-orders.ts). With a range → "selected range".
  const kpiScopeLabel = dateFromFilter.value && dateToFilter.value ? "selected range" : "today";
  const completedKpiLabel =
    dateFromFilter.value && dateToFilter.value ? "Completed" : "Completed today";

  // ── Realtime subscription with EXPLICIT filter clause (CLAUDE.md §22)
  // Only listen for orders.status=preparing changes. Single channel.
  React.useEffect(() => {
    if (status !== "preparing") return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("pos-orders-monitor")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: "status=eq.preparing",
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ACTIVE_ORDERS_QUERY_KEY });
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [status, queryClient, router]);

  // ── Filters ───────────────────────────────────────────────────────────
  const filteredRows = React.useMemo(() => {
    let rows = initialData.rows;
    if (posPointFilter.value) {
      rows = rows.filter((r) => r.posPointId === posPointFilter.value);
    }
    const q = search.value?.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => r.shortId.toLowerCase().includes(q));
    }
    return rows;
  }, [initialData.rows, posPointFilter.value, search.value]);

  const hasActiveFilters = Boolean(posPointFilter.value || search.value);

  const resetAll = () => {
    posPointFilter.set(null);
    search.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (posPointFilter.value) {
    const ppName = initialData.posPoints.find((p) => p.id === posPointFilter.value)?.displayName;
    chips.push(
      <FilterChip
        key="pp"
        name="Terminal"
        label={ppName ?? posPointFilter.value}
        onRemove={() => posPointFilter.set(null)}
        data-testid="orders-chip-pp"
      />,
    );
  }

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "shortId",
        header: "Order #",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-xs">{row.original.shortId}</span>
        ),
      },
      {
        id: "posPointName",
        header: "Terminal",
        cell: ({ row }) => row.original.posPointName,
      },
      {
        id: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatCents(row.original.totalAmount),
      },
      {
        id: "itemCount",
        header: "Items",
        cell: ({ row }) => row.original.itemCount,
      },
      ...(status === "preparing"
        ? [
            {
              id: "elapsed",
              header: "Elapsed",
              cell: ({ row }: { row: Row<OrderRow> }) => (
                <ElapsedCell createdAt={row.original.createdAt} />
              ),
            } satisfies ColumnDef<OrderRow>,
          ]
        : [
            {
              id: "paymentMethod",
              header: "Payment",
              cell: ({ row }: { row: Row<OrderRow> }) => row.original.paymentMethod ?? "—",
            } satisfies ColumnDef<OrderRow>,
            {
              id: "createdAt",
              header: "Time",
              cell: ({ row }: { row: Row<OrderRow> }) =>
                new Date(row.original.createdAt).toLocaleTimeString(),
            } satisfies ColumnDef<OrderRow>,
          ]),
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            enum="order_status"
            data-testid={`order-status-${row.original.id}`}
          />
        ),
      },
      ...(canCancel && status === "preparing"
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: Row<OrderRow> }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-status-danger-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCancelTarget(row.original);
                  }}
                  data-testid={`order-cancel-${row.original.id}`}
                >
                  Cancel
                </Button>
              ),
            },
          ] satisfies ColumnDef<OrderRow>[])
        : []),
    ],
    [status, canCancel],
  );

  async function handleCancelConfirm(reason?: string) {
    if (!cancelTarget || !reason) return;
    setIsCancelling(true);
    const res = await cancelOrder({ orderId: cancelTarget.id, reason });
    setIsCancelling(false);
    if (res.success) {
      toastSuccess(`Order ${cancelTarget.shortId} cancelled.`);
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ACTIVE_ORDERS_QUERY_KEY });
      router.refresh();
    } else {
      toastError(res);
    }
  }

  const { kpis, posPoints, nextCursorToken } = initialData;

  return (
    <div className="flex flex-col gap-6" data-testid="order-monitor-view">
      <PageHeader
        title="Order Monitor"
        description="Monitor active and recent POS orders across all terminals."
        data-testid="order-monitor-header"
      />

      <KpiCardRow data-testid="orders-kpis">
        <KpiCard
          label="Active"
          value={kpis.preparingCount}
          caption="orders preparing now"
          data-testid="order-kpi-preparing"
        />
        <KpiCard
          label={completedKpiLabel}
          value={kpis.completedToday}
          caption={`closed orders · ${kpiScopeLabel}`}
          data-testid="order-kpi-completed"
        />
        <KpiCard
          label="Avg ticket"
          value={formatCents(kpis.avgTicket)}
          caption={kpiScopeLabel}
          data-testid="order-kpi-avg-ticket"
        />
        <KpiCard
          label="Avg prep time"
          value={formatPrepTime(kpis.avgPrepSeconds)}
          caption={`completed orders · ${kpiScopeLabel}`}
          data-testid="order-kpi-avg-prep"
        />
      </KpiCardRow>

      <StatusTabBar
        tabs={[
          {
            value: "preparing",
            label: "Preparing",
            count: kpis.preparingCount,
            tone: "warning",
          },
          { value: "completed", label: "Completed", tone: "success" },
          { value: "cancelled", label: "Cancelled", tone: "danger" },
        ]}
        paramKey={STATUS_PARAM}
        defaultValue="preparing"
        shallow={false}
        ariaLabel="Order status"
        data-testid="orders-status-tabs"
      />

      <FilterableDataTable<OrderRow>
        toolbar={
          <FilterBar
            data-testid="orders-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search by order ID prefix…"
                aria-label="Search orders"
                debounceMs={300}
                data-testid="orders-search"
              />
            }
            controls={
              <>
                <Select
                  value={posPointFilter.value ?? "all"}
                  onValueChange={(next) => posPointFilter.set(next === "all" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Terminal filter"
                    data-testid="orders-filter-pp"
                  >
                    <SelectValue placeholder="All terminals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All terminals</SelectItem>
                    {posPoints.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {status !== "preparing" && (
                  <UrlDateRangePicker
                    fromParam={DATE_FROM_PARAM}
                    toParam={DATE_TO_PARAM}
                    aria-label="Date range"
                    data-testid="orders-date-range"
                    className="min-w-[16rem] sm:w-auto"
                  />
                )}
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: MOBILE_COLS,
          getRowId: (row) => row.id,
          renderSubComponent: (row) => <OrderExpandedRow order={row.original} />,
          expanded,
          onExpandedChange: setExpanded,
          "data-testid": "orders-table",
        }}
        pagination={
          status !== "preparing" ? (
            <CursorPagination nextCursorToken={nextCursorToken} data-testid="orders-pagination" />
          ) : undefined
        }
        hasActiveFilters={hasActiveFilters}
        emptyState={
          status === "preparing"
            ? { title: "No orders preparing.", variant: "first-use" }
            : { title: "No orders in this period.", variant: "filtered-out" }
        }
        data-testid="orders-filterable"
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel order?"
        description={
          cancelTarget
            ? `Cancel order ${cancelTarget.shortId} (${formatCents(cancelTarget.totalAmount)})?`
            : undefined
        }
        intent="destructive"
        confirmLabel="Cancel order"
        requireReason
        reasonLabel="Reason for cancellation"
        reasonPlaceholder="e.g. customer changed mind"
        onConfirm={handleCancelConfirm}
        pending={isCancelling}
        data-testid="cancel-order-dialog"
      />
    </div>
  );
}

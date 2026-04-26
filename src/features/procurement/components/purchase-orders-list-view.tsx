"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  Truck,
  Plus,
  Send,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import type {
  PurchaseOrderListData,
  PurchaseOrderRow,
  PoStatus,
} from "@/features/procurement/types";
import {
  PO_STATUSES,
  PO_STATUS_LABELS,
  PO_STATUS_TONES,
} from "@/features/procurement/types";
import { createPurchaseOrder } from "@/features/procurement/actions/create-purchase-order";
import { bulkMarkPoSent } from "@/features/procurement/actions/bulk-mark-po-sent";
import {
  createPurchaseOrderSchema,
  type CreatePurchaseOrderInput,
} from "@/features/procurement/schemas/purchase-order";

// ── Delivery indicator helpers ─────────────────────────────────────────

const DELIVERY_LABELS: Record<string, string> = {
  on_time: "On Time",
  due_soon: "Due Soon",
  overdue: "Overdue",
  none: "—",
};

const DELIVERY_TONES: Record<string, "success" | "warning" | "accent" | "neutral"> = {
  on_time: "success",
  due_soon: "warning",
  overdue: "accent",
  none: "neutral",
};

// ── Props ──────────────────────────────────────────────────────────────

type PurchaseOrdersListViewProps = Readonly<{
  data: PurchaseOrderListData;
  canWrite: boolean;
  locale: string;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * PurchaseOrdersListView — /management/procurement/purchase-orders
 *
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders`
 *   KPI row: "Open PO value", "Due this week", "Overdue"
 *   Status tabs with counts: Draft | Sent | Receiving | Completed | Cancelled
 *   Within each tab: filters by supplier, search
 *   Columns: supplier, status, order_date, expected_delivery_date, location,
 *            item count, total value, delivery indicator
 */
export function PurchaseOrdersListView({
  data,
  canWrite,
  locale: _locale,
}: PurchaseOrdersListViewProps) {
  const router = useRouter();
  const supplierFilter = useUrlString("supplier");
  const searchFilter = useUrlString("q");
  const statusFilter = useUrlString("status");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = React.useState(false);

  // ── Active tab from URL ────────────────────────────────────────────
  const activeStatus: PoStatus = PO_STATUSES.includes(
    statusFilter.value as PoStatus,
  )
    ? (statusFilter.value as PoStatus)
    : "sent";

  // ── Filter data ──────────────────────────────────────────────────────
  const filteredOrders = React.useMemo(() => {
    let result = data.orders.filter((o) => o.status === activeStatus);

    if (supplierFilter.value) {
      result = result.filter((o) => o.supplierId === supplierFilter.value);
    }

    const q = searchFilter.value?.toLowerCase();
    if (q) {
      result = result.filter((o) =>
        o.supplierName.toLowerCase().includes(q),
      );
    }

    // Sort per spec
    if (activeStatus === "sent" || activeStatus === "partially_received") {
      result.sort((a, b) =>
        (a.expectedDeliveryDate ?? "").localeCompare(b.expectedDeliveryDate ?? ""),
      );
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result;
  }, [data.orders, activeStatus, supplierFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(supplierFilter.value || searchFilter.value);

  // ── Filter-reactive KPIs ────────────────────────────────────────────
  const filteredKpis = React.useMemo(() => {
    const source = hasActiveFilters
      ? data.orders.filter((o) => {
          if (supplierFilter.value && o.supplierId !== supplierFilter.value) return false;
          const q = searchFilter.value?.toLowerCase();
          if (q && !o.supplierName.toLowerCase().includes(q)) return false;
          return true;
        })
      : data.orders;

    let openPoValue = 0;
    let dueThisWeekCount = 0;
    let overdueCount = 0;
    for (const o of source) {
      if (o.status === "draft" || o.status === "sent" || o.status === "partially_received") {
        openPoValue += o.totalValue;
      }
      if (o.deliveryIndicator === "due_soon") dueThisWeekCount++;
      if (o.deliveryIndicator === "overdue") overdueCount++;
    }
    return { openPoValue, dueThisWeekCount, overdueCount };
  }, [data.orders, supplierFilter.value, searchFilter.value, hasActiveFilters]);

  // ── Reset filters helper ────────────────────────────────────────────
  const resetAll = React.useCallback(() => {
    supplierFilter.set(null);
    searchFilter.set(null);
  }, [supplierFilter, searchFilter]);

  // ── Status tabs ────────────────────────────────────────────────────
  const statusTabs = PO_STATUSES.map((s) => ({
    value: s,
    label: PO_STATUS_LABELS[s],
    count: data.statusCounts[s],
  }));

  // ── Row selection (for bulk mark sent on draft tab) ─────────────────
  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredOrders.length) return new Set();
      return new Set(filteredOrders.map((o) => o.id));
    });
  }, [filteredOrders]);

  // Reset selection when tab changes
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [activeStatus]);

  // ── Bulk action handler ─────────────────────────────────────────────
  const handleBulkMarkSent = async () => {
    if (selectedIds.size === 0) return;
    setBulkPending(true);
    try {
      const result = await bulkMarkPoSent({ poIds: Array.from(selectedIds) });
      if (result.success) {
        toastSuccess(`${result.data.count} PO(s) marked as sent`);
        setSelectedIds(new Set());
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    } finally {
      setBulkPending(false);
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<PurchaseOrderRow, unknown>[]>(
    () => [
      ...(activeStatus === "draft" && canWrite
        ? [
            {
              id: "select",
              header: () => (
                <input
                  type="checkbox"
                  className="size-4"
                  checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              ),
              cell: ({ row }: { row: { original: PurchaseOrderRow } }) => (
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selectedIds.has(row.original.id)}
                  onChange={() => toggleSelect(row.original.id)}
                  aria-label={`Select PO from ${row.original.supplierName}`}
                />
              ),
              enableSorting: false,
              meta: { headerClassName: "w-0", cellClassName: "w-0" },
            } satisfies ColumnDef<PurchaseOrderRow, unknown>,
          ]
        : []),
      {
        id: "supplierName",
        accessorKey: "supplierName",
        header: "Supplier",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.supplierName}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={PO_STATUS_LABELS[row.original.status]}
            tone={PO_STATUS_TONES[row.original.status]}
          />
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "orderDate",
        accessorKey: "orderDate",
        header: "Order Date",
        cell: ({ row }) =>
          row.original.orderDate ? format(parseISO(row.original.orderDate), "dd MMM yyyy") : "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "expectedDeliveryDate",
        accessorKey: "expectedDeliveryDate",
        header: "Expected Delivery",
        cell: ({ row }) =>
          row.original.expectedDeliveryDate
            ? format(parseISO(row.original.expectedDeliveryDate), "dd MMM yyyy")
            : "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "receivingLocationName",
        accessorKey: "receivingLocationName",
        header: "Location",
        cell: ({ row }) => row.original.receivingLocationName ?? "—",
      },
      {
        id: "itemCount",
        accessorKey: "itemCount",
        header: "Items",
        cell: ({ row }) => row.original.itemCount.toLocaleString(),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "totalValue",
        accessorKey: "totalValue",
        header: "Total Value",
        cell: ({ row }) =>
          row.original.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "deliveryIndicator",
        accessorKey: "deliveryIndicator",
        header: "Delivery",
        cell: ({ row }) => {
          const ind = row.original.deliveryIndicator;
          if (ind === "none") return <span className="text-foreground-muted">—</span>;
          return (
            <StatusBadge
              status={DELIVERY_LABELS[ind] ?? ind}
              tone={DELIVERY_TONES[ind] ?? "neutral"}
            />
          );
        },
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
    ],
    [activeStatus, canWrite, filteredOrders.length, selectedIds, toggleSelect, toggleSelectAll],
  );

  // ── Unique suppliers for filter dropdown ─────────────────────────────
  const supplierOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const o of data.orders) {
      if (!map.has(o.supplierId)) map.set(o.supplierId, o.supplierName);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [data.orders]);

  // ── Filter chips ────────────────────────────────────────────────────
  const chipNodes: React.ReactNode[] = [];
  if (supplierFilter.value) {
    chipNodes.push(
      <FilterChip
        key="supplier"
        name="Supplier"
        label={supplierOptions.find((s) => s.id === supplierFilter.value)?.name ?? "?"}
        onRemove={() => supplierFilter.set(null)}
        data-testid="procurement-po-chip-supplier"
      />,
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="procurement-po-list">
      <PageHeader
        title="Purchase Orders"
        description="List and manage all purchase orders — track status, delivery dates, and PO value."
        data-testid="procurement-po-page-header"
        primaryAction={
          canWrite ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="procurement-create-po-btn"
            >
              <Plus aria-hidden className="size-4" /> New PO
            </Button>
          ) : undefined
        }
      />

      {/* ── Status Tabs ──────────────────────────────────────────── */}
      <StatusTabBar
        tabs={statusTabs}
        paramKey="status"
        defaultValue="sent"
        ariaLabel="Purchase order status filter"
        onValueChange={() => {
          setSelectedIds(new Set());
        }}
        data-testid="procurement-po-status-tabs"
      />

      {/* ── Bulk Action Bar (draft tab only) ─────────────────────── */}
      {activeStatus === "draft" && canWrite && selectedIds.size > 0 ? (
        <div className="bg-surface-elevated flex items-center gap-3 rounded-lg border p-3">
          <span className="text-foreground-muted text-sm">
            {selectedIds.size} PO{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={handleBulkMarkSent}
            disabled={bulkPending}
            data-testid="procurement-po-bulk-send-btn"
          >
            <Send aria-hidden className="size-3.5" />
            {bulkPending ? "Sending…" : "Mark as Sent"}
          </Button>
        </div>
      ) : null}

      {/* ── FilterableDataTable ──────────────────────────────────── */}
      <FilterableDataTable<PurchaseOrderRow>
        kpis={
          <KpiCardRow data-testid="procurement-po-kpis">
            <KpiCard
              label="Open PO Value"
              value={`$${filteredKpis.openPoValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<ShoppingCart aria-hidden className="size-4" />}
              data-testid="procurement-po-kpi-open-value"
            />
            <KpiCard
              label="Due This Week"
              value={filteredKpis.dueThisWeekCount.toLocaleString()}
              icon={<Clock aria-hidden className="size-4" />}
              data-testid="procurement-po-kpi-due-week"
            />
            <KpiCard
              label="Overdue"
              value={filteredKpis.overdueCount.toLocaleString()}
              icon={<AlertTriangle aria-hidden className="size-4" />}
              data-testid="procurement-po-kpi-overdue"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="procurement-po-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search supplier…"
                aria-label="Search purchase orders"
                debounceMs={300}
                data-testid="procurement-po-search"
              />
            }
            controls={
              <Select
                value={supplierFilter.value ?? "__all__"}
                onValueChange={(next) =>
                  supplierFilter.set(next === "__all__" ? null : next)
                }
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Supplier"
                  data-testid="procurement-po-supplier-filter"
                >
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Suppliers</SelectItem>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            chips={chipNodes.length > 0 ? chipNodes : null}
          />
        }
        table={{
          data: filteredOrders,
          columns,
          mobileFieldPriority: ["supplierName", "status", "totalValue", "expectedDeliveryDate"],
          getRowId: (row) => row.id,
          onRowClick: (row) =>
            router.push(`/management/procurement/purchase-orders/${row.id}` as never),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: `No ${PO_STATUS_LABELS[activeStatus].toLowerCase()} purchase orders`,
          description:
            activeStatus === "draft"
              ? "Create a new purchase order to get started."
              : "No purchase orders match your filters.",
          icon: <Truck className="size-8" />,
        }}
        data-testid="procurement-po-table"
      />

      {/* ── Create PO FormSheet ─────────────────────────────────── */}
      <CreatePurchaseOrderSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        suppliers={data.suppliers}
        locations={data.locations}
      />
    </div>
  );
}

// ── Create PO FormSheet ───────────────────────────────────────────────

function CreatePurchaseOrderSheet({
  open,
  onOpenChange,
  suppliers,
  locations,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suppliers: ReadonlyArray<{ id: string; name: string }>;
  locations: ReadonlyArray<{ id: string; name: string }>;
}>) {
  const [pending, setPending] = React.useState(false);
  const today = new Date().toISOString().split("T")[0]!;
  const form = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(createPurchaseOrderSchema) as Resolver<CreatePurchaseOrderInput>,
    defaultValues: {
      supplierId: "",
      receivingLocationId: "",
      orderDate: today,
      expectedDeliveryDate: "",
      notes: "",
    },
  });
  const ctl = form.control;

  const handleSubmit = async (values: CreatePurchaseOrderInput) => {
    setPending(true);
    try {
      const result = await createPurchaseOrder(values);
      if (result.success) {
        toastSuccess("Purchase order created");
        onOpenChange(false);
        form.reset({
          supplierId: "",
          receivingLocationId: "",
          orderDate: new Date().toISOString().split("T")[0]!,
          expectedDeliveryDate: "",
          notes: "",
        });
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Purchase Order"
      description="Create a new purchase order with a supplier and receiving location."
      formId="create-po-form"
      submitLabel="Create PO"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="procurement-create-po-sheet"
    >
      <FormProvider {...form}>
        <form
          id="create-po-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="PO Details">
            <FormRow>
              <FormField
                control={ctl}
                name="supplierId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Supplier *</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger data-testid="procurement-po-supplier-select">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Select supplier
                        </SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ctl}
                name="receivingLocationId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Receiving Location *</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger data-testid="procurement-po-location-select">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Select location
                        </SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormRow>
              <FormField
                control={ctl}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Order Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="procurement-po-order-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ctl}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Expected Delivery</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="procurement-po-delivery-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={ctl}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional notes…" data-testid="procurement-po-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        </form>
      </FormProvider>
    </FormSheet>
  );
}

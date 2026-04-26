"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Siren,
  Wrench,
  XCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormRow } from "@/components/ui/form-row";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import type {
  OrderFormContext,
  OrderListRow,
  OrderSectionCounts,
  OrdersListData,
  OrdersSection,
} from "@/features/maintenance/types";
import {
  cancelOrderSchema,
  createOrderSchema,
  updateOrderSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
} from "@/features/maintenance/schemas/upsert-order";
import { cancelOrder } from "@/features/maintenance/actions/cancel-order";
import { completeOrder } from "@/features/maintenance/actions/complete-order";
import { createOrder } from "@/features/maintenance/actions/create-order";
import { updateOrder } from "@/features/maintenance/actions/update-order";

// ── Helpers ──────────────────────────────────────────────────────────────

const DT_FORMAT = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(iso: string): string {
  return DT_FORMAT.format(new Date(iso));
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** datetime-local <input> uses the user's local TZ; ISO out, local in. */
function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const HISTORY_FILTER_OPTIONS = [
  { value: "all", label: "All history" },
  { value: "completed", label: "Completed only" },
  { value: "cancelled", label: "Cancelled only" },
] as const;

// ── Top-level view ───────────────────────────────────────────────────────

type Props = Readonly<{
  data: OrdersListData;
  canCreate: boolean;
  canMutate: boolean;
}>;

export function OrdersListView({ data, canCreate, canMutate }: Props) {
  const router = useRouter();

  // Section tab — client-only filter (data already loaded). Spec says
  // ?section=live|queue|history default live.
  const [section] = useQueryState(
    "section",
    parseAsString.withDefault("live").withOptions({
      clearOnDefault: true,
      shallow: true,
      history: "replace",
    }),
  );
  const sectionValue = (
    ["live", "queue", "history"].includes(section ?? "live") ? section : "live"
  ) as OrdersSection;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTargetId, setEditTargetId] = React.useState<string | null>(null);
  const [completeTargetId, setCompleteTargetId] = React.useState<string | null>(
    null,
  );
  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);

  const editTarget = React.useMemo(
    () => data.rows.find((r) => r.id === editTargetId) ?? null,
    [data.rows, editTargetId],
  );

  // Realtime — frontend_spec.md:2685 ("live session status changes
  // (active → completed) update without refresh"). Filter is explicit
  // per CLAUDE.md §22 / postmortem ("event:'*', table:'orders' without
  // a filter is a violation"). Filtering on `status=in.(active,
  // completed,cancelled)` catches every transition the live + history
  // sections care about — scheduled→active (crew authorize),
  // active→completed (manager Complete OR crew revoke), and
  // any→cancelled. Draft↔scheduled edits don't fire here; the
  // dispatch-queue tab refreshes naturally on the next user action.
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("maintenance-orders-mgmt")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "maintenance_orders",
          filter: "status=in.(active,completed,cancelled)",
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="maintenance-orders-list"
    >
      <PageHeader
        title="Work Orders"
        description="Schedule, monitor, and close maintenance work orders. Live RADIUS access updates the moment a sponsor authorizes."
        data-testid="maintenance-orders-header"
        primaryAction={
          canCreate ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="maintenance-orders-create-btn"
            >
              <Plus aria-hidden className="size-4" /> New Work Order
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="maintenance-orders-kpis">
        <KpiCard
          label="Active sessions"
          value={data.kpis.activeSessions}
          caption="vendors on-site / remote now"
          icon={<Activity aria-hidden className="size-4" />}
          data-testid="maintenance-orders-kpi-active"
        />
        <KpiCard
          label="Scheduled"
          value={data.kpis.scheduled}
          caption="dispatch queue"
          icon={<CalendarDays aria-hidden className="size-4" />}
          data-testid="maintenance-orders-kpi-scheduled"
        />
        <KpiCard
          label="Overdue"
          value={data.kpis.overdue}
          caption="past maintenance window"
          icon={<Siren aria-hidden className="size-4" />}
          data-testid="maintenance-orders-kpi-overdue"
        />
        <KpiCard
          label="Completed this week"
          value={data.kpis.completedThisWeek}
          caption="closed since Monday"
          icon={<CheckCircle2 aria-hidden className="size-4" />}
          data-testid="maintenance-orders-kpi-completed"
        />
      </KpiCardRow>

      <StatusTabBar
        ariaLabel="Work order section"
        paramKey="section"
        defaultValue="live"
        data-testid="maintenance-orders-tabs"
        tabs={[
          {
            value: "live",
            label: "Live Sessions",
            count: data.counts.live,
            tone: "info",
          },
          {
            value: "queue",
            label: "Dispatch Queue",
            count: data.counts.queue,
            tone: "warning",
          },
          {
            value: "history",
            label: "History",
            count: data.counts.history,
            tone: "neutral",
          },
        ]}
      />

      {sectionValue === "live" ? (
        <LiveSessionsTable
          rows={data.rows}
          counts={data.counts}
          canMutate={canMutate}
          onComplete={(id) => setCompleteTargetId(id)}
          onCancel={(id) => setCancelTargetId(id)}
        />
      ) : sectionValue === "queue" ? (
        <DispatchQueueTable
          rows={data.rows}
          counts={data.counts}
          canMutate={canMutate}
          onEdit={(id) => setEditTargetId(id)}
          onCancel={(id) => setCancelTargetId(id)}
        />
      ) : (
        <HistoryTable rows={data.rows} counts={data.counts} />
      )}

      <CreateOrderSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        context={data.context}
        onCreated={() => router.refresh()}
      />

      {editTarget ? (
        <EditOrderSheet
          row={editTarget}
          context={data.context}
          onClose={() => setEditTargetId(null)}
          onUpdated={() => router.refresh()}
        />
      ) : null}

      <CompleteOrderDialog
        targetId={completeTargetId}
        onClose={() => setCompleteTargetId(null)}
        onCompleted={() => router.refresh()}
      />

      <CancelOrderDialog
        targetId={cancelTargetId}
        onClose={() => setCancelTargetId(null)}
        onCancelled={() => router.refresh()}
      />
    </div>
  );
}

// ── Section A: Live Sessions ─────────────────────────────────────────────

function LiveSessionsTable({
  rows,
  counts,
  canMutate,
  onComplete,
  onCancel,
}: Readonly<{
  rows: ReadonlyArray<OrderListRow>;
  counts: OrderSectionCounts;
  canMutate: boolean;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}>) {
  const searchFilter = useUrlString("q");
  const liveRows = React.useMemo(
    () => rows.filter((r) => r.status === "active"),
    [rows],
  );

  const filtered = React.useMemo(() => {
    const q = searchFilter.value?.toLowerCase().trim();
    if (!q) return liveRows;
    return liveRows.filter(
      (r) =>
        r.deviceName.toLowerCase().includes(q) ||
        r.vendorName.toLowerCase().includes(q) ||
        (r.deviceLocation?.toLowerCase().includes(q) ?? false) ||
        (r.sponsorName?.toLowerCase().includes(q) ?? false),
    );
  }, [liveRows, searchFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value);

  const columns = React.useMemo<ColumnDef<OrderListRow, unknown>[]>(
    () => [
      {
        id: "device",
        header: "Device",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.deviceName}</span>
            {row.original.deviceLocation ? (
              <span className="text-foreground-muted text-xs">
                <MapPin aria-hidden className="mr-0.5 inline size-3" />
                {row.original.deviceLocation}
              </span>
            ) : null}
          </div>
        ),
      },
      { id: "vendor", header: "Vendor", cell: ({ row }) => row.original.vendorName },
      {
        id: "topology",
        header: "Type",
        cell: ({ row }) => (row.original.topology === "remote" ? "Remote" : "On-site"),
      },
      {
        id: "sponsor",
        header: "Sponsor",
        cell: ({ row }) => row.original.sponsorName ?? "—",
      },
      {
        id: "ends",
        header: "Ends",
        cell: ({ row }) => {
          const endMs = new Date(row.original.maintenanceEnd).getTime();
          const remaining = Math.max(
            0,
            Math.floor((endMs - Date.now()) / 1000),
          );
          const overdue = endMs < Date.now();
          return (
            <span
              className={
                overdue
                  ? "text-status-danger-foreground tabular-nums"
                  : "tabular-nums"
              }
            >
              {overdue ? "Overdue" : formatDuration(remaining)}
            </span>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            {canMutate ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete(row.original.id)}
                  data-testid={`maintenance-orders-complete-${row.original.id}`}
                >
                  <CheckCircle2 aria-hidden className="size-4" /> Complete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(row.original.id)}
                  data-testid={`maintenance-orders-kill-${row.original.id}`}
                >
                  <XCircle aria-hidden className="size-4" /> Kill
                </Button>
              </>
            ) : null}
          </div>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [canMutate, onComplete, onCancel],
  );

  return (
    <FilterableDataTable<OrderListRow>
      toolbar={
        <FilterBar
          data-testid="maintenance-orders-live-filters"
          hasActiveFilters={hasActiveFilters}
          onClearAll={() => searchFilter.set(null)}
          search={
            <UrlSearchInput
              param="q"
              placeholder="Search device, vendor, location, sponsor…"
              aria-label="Search live sessions"
              debounceMs={300}
              data-testid="maintenance-orders-live-search"
            />
          }
        />
      }
      table={{
        data: filtered,
        columns,
        mobileFieldPriority: ["device", "vendor", "ends"],
        getRowId: (row) => row.id,
      }}
      hasActiveFilters={hasActiveFilters}
      emptyState={{
        variant: hasActiveFilters ? "filtered-out" : "first-use",
        title: hasActiveFilters ? "No matching live sessions" : "No live sessions",
        description: hasActiveFilters
          ? "Clear filters to see all active vendors."
          : counts.queue > 0
            ? "Sessions appear here once a sponsor authorizes a vendor."
            : "Schedule a work order from the dispatch queue to bring vendors on site.",
        icon: <Activity className="size-8" />,
      }}
      data-testid="maintenance-orders-live-table"
    />
  );
}

// ── Section B: Dispatch Queue ────────────────────────────────────────────

function DispatchQueueTable({
  rows,
  counts,
  canMutate,
  onEdit,
  onCancel,
}: Readonly<{
  rows: ReadonlyArray<OrderListRow>;
  counts: OrderSectionCounts;
  canMutate: boolean;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
}>) {
  const searchFilter = useUrlString("q");
  const queueRows = React.useMemo(
    () => rows.filter((r) => r.status === "draft" || r.status === "scheduled"),
    [rows],
  );

  const filtered = React.useMemo(() => {
    const q = searchFilter.value?.toLowerCase().trim();
    if (!q) return queueRows;
    return queueRows.filter(
      (r) =>
        r.deviceName.toLowerCase().includes(q) ||
        r.vendorName.toLowerCase().includes(q) ||
        (r.deviceLocation?.toLowerCase().includes(q) ?? false) ||
        (r.sponsorName?.toLowerCase().includes(q) ?? false),
    );
  }, [queueRows, searchFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value);

  const columns = React.useMemo<ColumnDef<OrderListRow, unknown>[]>(
    () => [
      {
        id: "device",
        header: "Device",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.deviceName}</span>
            {row.original.deviceLocation ? (
              <span className="text-foreground-muted text-xs">
                {row.original.deviceLocation}
              </span>
            ) : null}
          </div>
        ),
      },
      { id: "vendor", header: "Vendor", cell: ({ row }) => row.original.vendorName },
      {
        id: "topology",
        header: "Type",
        cell: ({ row }) => (row.original.topology === "remote" ? "Remote" : "On-site"),
      },
      {
        id: "window",
        header: "Window",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatDateTime(row.original.maintenanceStart)} →{" "}
            {formatDateTime(row.original.maintenanceEnd)}
          </span>
        ),
        meta: { headerClassName: "whitespace-nowrap" },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            enum="mo_status"
            data-testid={`maintenance-orders-status-${row.original.id}`}
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            {canMutate ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(row.original.id)}
                  aria-label="Edit"
                  data-testid={`maintenance-orders-edit-${row.original.id}`}
                >
                  <Pencil aria-hidden className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(row.original.id)}
                  aria-label="Cancel"
                  data-testid={`maintenance-orders-cancel-${row.original.id}`}
                >
                  <XCircle aria-hidden className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [canMutate, onEdit, onCancel],
  );

  return (
    <FilterableDataTable<OrderListRow>
      toolbar={
        <FilterBar
          data-testid="maintenance-orders-queue-filters"
          hasActiveFilters={hasActiveFilters}
          onClearAll={() => searchFilter.set(null)}
          search={
            <UrlSearchInput
              param="q"
              placeholder="Search device, vendor, sponsor…"
              aria-label="Search dispatch queue"
              debounceMs={300}
              data-testid="maintenance-orders-queue-search"
            />
          }
        />
      }
      table={{
        data: filtered,
        columns,
        mobileFieldPriority: ["device", "vendor", "status"],
        getRowId: (row) => row.id,
      }}
      hasActiveFilters={hasActiveFilters}
      emptyState={{
        variant: hasActiveFilters ? "filtered-out" : "first-use",
        title: hasActiveFilters ? "No matching queued orders" : "Dispatch queue empty",
        description: hasActiveFilters
          ? "Clear filters to see all pending work."
          : counts.history > 0
            ? "Create a new work order to schedule a maintenance window."
            : "No work orders yet — create one to get started.",
        icon: <CalendarClock className="size-8" />,
      }}
      data-testid="maintenance-orders-queue-table"
    />
  );
}

// ── Section C: History ───────────────────────────────────────────────────

function HistoryTable({
  rows,
  counts,
}: Readonly<{
  rows: ReadonlyArray<OrderListRow>;
  counts: OrderSectionCounts;
}>) {
  const searchFilter = useUrlString("q");
  const statusFilter = useUrlString("hstatus");

  const historyRows = React.useMemo(
    () => rows.filter((r) => r.status === "completed" || r.status === "cancelled"),
    [rows],
  );

  const filtered = React.useMemo(() => {
    let r = [...historyRows];
    const status = statusFilter.value ?? "all";
    if (status === "completed") r = r.filter((row) => row.status === "completed");
    if (status === "cancelled") r = r.filter((row) => row.status === "cancelled");
    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      r = r.filter(
        (row) =>
          row.deviceName.toLowerCase().includes(q) ||
          row.vendorName.toLowerCase().includes(q) ||
          (row.sponsorName?.toLowerCase().includes(q) ?? false),
      );
    }
    return r;
  }, [historyRows, searchFilter.value, statusFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value || statusFilter.value);

  const chips: React.ReactNode[] = [];
  if (statusFilter.value) {
    const label =
      HISTORY_FILTER_OPTIONS.find((o) => o.value === statusFilter.value)?.label ??
      statusFilter.value;
    chips.push(
      <FilterChip
        key="status"
        name="Status"
        label={label}
        onRemove={() => statusFilter.set(null)}
        data-testid="maintenance-orders-history-chip-status"
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<OrderListRow, unknown>[]>(
    () => [
      {
        id: "device",
        header: "Device",
        cell: ({ row }) => row.original.deviceName,
      },
      { id: "vendor", header: "Vendor", cell: ({ row }) => row.original.vendorName },
      {
        id: "topology",
        header: "Type",
        cell: ({ row }) => (row.original.topology === "remote" ? "Remote" : "On-site"),
      },
      {
        id: "window",
        header: "Window",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatDateTime(row.original.maintenanceStart)} →{" "}
            {formatDateTime(row.original.maintenanceEnd)}
          </span>
        ),
        meta: { headerClassName: "whitespace-nowrap" },
      },
      {
        id: "closed",
        header: "Closed",
        cell: ({ row }) =>
          row.original.completedAt ? (
            <span className="tabular-nums whitespace-nowrap">
              {formatDateTime(row.original.completedAt)}
            </span>
          ) : (
            "—"
          ),
        meta: { headerClassName: "whitespace-nowrap" },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            enum="mo_status"
            data-testid={`maintenance-orders-status-${row.original.id}`}
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
    <FilterableDataTable<OrderListRow>
      toolbar={
        <FilterBar
          data-testid="maintenance-orders-history-filters"
          hasActiveFilters={hasActiveFilters}
          onClearAll={() => {
            searchFilter.set(null);
            statusFilter.set(null);
          }}
          search={
            <UrlSearchInput
              param="q"
              placeholder="Search device, vendor, sponsor…"
              aria-label="Search history"
              debounceMs={300}
              data-testid="maintenance-orders-history-search"
            />
          }
          controls={
            <Select
              value={statusFilter.value ?? "all"}
              onValueChange={(v) => statusFilter.set(v === "all" ? null : v)}
            >
              <SelectTrigger
                className="h-10 min-w-[10rem] sm:w-auto"
                data-testid="maintenance-orders-history-status"
              >
                <SelectValue placeholder="All history" />
              </SelectTrigger>
              <SelectContent>
                {HISTORY_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          chips={chips.length > 0 ? chips : null}
        />
      }
      table={{
        data: filtered,
        columns,
        mobileFieldPriority: ["device", "vendor", "status", "closed"],
        getRowId: (row) => row.id,
      }}
      hasActiveFilters={hasActiveFilters}
      emptyState={{
        variant: hasActiveFilters ? "filtered-out" : "first-use",
        title: hasActiveFilters ? "No matching history" : "No closed work orders",
        description: hasActiveFilters
          ? "Try clearing filters or adjusting your search."
          : counts.queue + counts.live > 0
            ? "Completed and cancelled work orders will land here."
            : "Closed work orders will appear once you complete or cancel one.",
        icon: <Clock className="size-8" />,
      }}
      data-testid="maintenance-orders-history-table"
    />
  );
}

// ── Create / Edit form sheet ─────────────────────────────────────────────

const NETWORK_GROUP_OPTIONS = [
  { value: "guest", label: "Guest WiFi" },
  { value: "staff", label: "Staff network" },
  { value: "vendor-isolated", label: "Vendor-isolated VLAN" },
] as const;

type FormBaseValues = CreateOrderInput;

function buildDefaults(row: OrderListRow | null): FormBaseValues {
  if (!row) {
    const now = new Date();
    const later = new Date(now.getTime() + 4 * 3600 * 1000);
    return {
      topology: "onsite",
      targetDeviceId: "",
      vendorId: "",
      maintenanceStart: isoToLocalInput(now.toISOString()),
      maintenanceEnd: isoToLocalInput(later.toISOString()),
      madLimitMinutes: 120,
      scope: null,
      sponsorId: null,
      switchPort: null,
      networkGroup: null,
      vendorMacAddress: null,
    };
  }
  return {
    topology: row.topology,
    targetDeviceId: row.deviceId,
    vendorId: row.vendorId,
    maintenanceStart: isoToLocalInput(row.maintenanceStart),
    maintenanceEnd: isoToLocalInput(row.maintenanceEnd),
    madLimitMinutes: row.madLimitMinutes ?? 120,
    scope: row.scope,
    sponsorId: row.sponsorId,
    switchPort: row.switchPort,
    networkGroup: row.networkGroup,
    vendorMacAddress: row.vendorMacAddress,
  };
}

function CreateOrderSheet({
  open,
  onOpenChange,
  context,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: OrderFormContext;
  onCreated: () => void;
}>) {
  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as Resolver<CreateOrderInput>,
    defaultValues: buildDefaults(null),
  });

  React.useEffect(() => {
    if (open) form.reset(buildDefaults(null));
  }, [open, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: CreateOrderInput): Promise<void> => {
    setPending(true);
    try {
      const result = await createOrder(values);
      if (result.success) {
        toastSuccess("Work order scheduled.");
        onOpenChange(false);
        onCreated();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as never, { type: "server", message });
          }
        }
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Work Order"
      description="Schedule a maintenance window. Vendors receive RADIUS access only after a sponsor authorizes them."
      formId="maintenance-orders-create-form"
      submitLabel="Schedule"
      pending={pending}
      submitDisabled={pending}
      width="lg"
      data-testid="maintenance-orders-create-sheet"
    >
      <FormProvider {...form}>
        <form
          id="maintenance-orders-create-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          <OrderFormBody form={form} context={context} />
        </form>
      </FormProvider>
    </FormSheet>
  );
}

function EditOrderSheet({
  row,
  context,
  onClose,
  onUpdated,
}: Readonly<{
  row: OrderListRow;
  context: OrderFormContext;
  onClose: () => void;
  onUpdated: () => void;
}>) {
  const form = useForm<UpdateOrderInput>({
    resolver: zodResolver(updateOrderSchema) as Resolver<UpdateOrderInput>,
    defaultValues: { id: row.id, ...buildDefaults(row) },
  });

  React.useEffect(() => {
    form.reset({ id: row.id, ...buildDefaults(row) });
  }, [row, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: UpdateOrderInput): Promise<void> => {
    setPending(true);
    try {
      const result = await updateOrder(values);
      if (result.success) {
        toastSuccess("Work order updated.");
        onClose();
        onUpdated();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as never, { type: "server", message });
          }
        }
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Edit Work Order"
      description="Adjust the schedule, vendor, or scope while the order is still in the dispatch queue."
      formId="maintenance-orders-edit-form"
      submitLabel="Save changes"
      pending={pending}
      submitDisabled={pending}
      width="lg"
      data-testid="maintenance-orders-edit-sheet"
    >
      <FormProvider {...form}>
        <form
          id="maintenance-orders-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          {/*
            Edit form's UseFormReturn extends create's by an `id` field;
            the body only touches the shared field surface, so cast
            through unknown to satisfy the create-shape signature.
          */}
          <OrderFormBody
            form={form as unknown as ReturnType<typeof useForm<FormBaseValues>>}
            context={context}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}

function OrderFormBody({
  form,
  context,
}: Readonly<{
  // Both create + edit forms share the same field surface (edit adds
  // only `id`); take the looser create shape here so both call sites
  // can pass their `useForm` return without conflicting type narrowing.
  form: ReturnType<typeof useForm<FormBaseValues>>;
  context: OrderFormContext;
}>) {
  const topology = form.watch("topology");

  type Option = { value: string; label: string; description?: string };
  const deviceOptions = React.useMemo<Option[]>(
    () =>
      context.devices.map((d) =>
        d.zoneName
          ? { value: d.id, label: d.name, description: d.zoneName }
          : { value: d.id, label: d.name },
      ),
    [context.devices],
  );
  const vendorOptions = React.useMemo<Option[]>(
    () =>
      context.vendors.map((v) =>
        v.specialization
          ? { value: v.id, label: v.name, description: v.specialization }
          : { value: v.id, label: v.name },
      ),
    [context.vendors],
  );
  const sponsorOptions = React.useMemo<Option[]>(
    () =>
      context.sponsors.map((s) =>
        s.roleDisplayName
          ? {
              value: s.staffRecordId,
              label: s.displayName,
              description: s.roleDisplayName,
            }
          : { value: s.staffRecordId, label: s.displayName },
      ),
    [context.sponsors],
  );

  return (
    <>
      <FormSection title="Target">
        <FormField
          control={form.control}
          name="targetDeviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target device *</FormLabel>
              <FormControl>
                <SearchableSelect
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  options={deviceOptions}
                  placeholder="Pick a device"
                  searchPlaceholder="Search devices…"
                  data-testid="maintenance-orders-form-device"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vendorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor *</FormLabel>
              <FormControl>
                <SearchableSelect
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  options={vendorOptions}
                  placeholder="Pick an active vendor"
                  searchPlaceholder="Search vendors…"
                  data-testid="maintenance-orders-form-vendor"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Window">
        <FormField
          control={form.control}
          name="topology"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work type *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="maintenance-orders-form-topology">
                    <SelectValue placeholder="Choose work type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormRow>
          <FormField
            control={form.control}
            name="maintenanceStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    data-testid="maintenance-orders-form-start"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maintenanceEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    data-testid="maintenance-orders-form-end"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormRow>
        <FormField
          control={form.control}
          name="madLimitMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access limit (minutes) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={typeof field.value === "number" ? field.value : ""}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  data-testid="maintenance-orders-form-mad-limit"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scope (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="What will the vendor be doing?"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : e.target.value)
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  data-testid="maintenance-orders-form-scope"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {topology === "onsite" ? (
        <FormSection
          title="On-site dispatch"
          description="Required when a vendor needs physical or network access on premises."
        >
          <FormField
            control={form.control}
            name="sponsorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Crew sponsor *</FormLabel>
                <FormControl>
                  <SearchableSelect
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    options={sponsorOptions}
                    placeholder="Pick a sponsor"
                    searchPlaceholder="Search staff…"
                    data-testid="maintenance-orders-form-sponsor"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormRow>
            <FormField
              control={form.control}
              name="switchPort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Switch port</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Gi1/0/24"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      data-testid="maintenance-orders-form-switch-port"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="networkGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network group</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-10"
                        data-testid="maintenance-orders-form-network-group"
                      >
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {NETWORK_GROUP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
        </FormSection>
      ) : null}
    </>
  );
}

// ── Confirm dialogs ──────────────────────────────────────────────────────

function CompleteOrderDialog({
  targetId,
  onClose,
  onCompleted,
}: Readonly<{
  targetId: string | null;
  onClose: () => void;
  onCompleted: () => void;
}>) {
  const [pending, setPending] = React.useState(false);

  return (
    <ConfirmDialog
      open={targetId !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      intent="info"
      icon={<Wrench className="size-7" />}
      title="Complete work order"
      description="Vendor RADIUS access ends immediately. The session moves to history."
      requireReason
      reasonLabel="Sponsor remark *"
      reasonPlaceholder="What was done or any issues observed…"
      confirmLabel={pending ? "Completing…" : "Complete"}
      pending={pending}
      onConfirm={async (reason) => {
        if (!targetId || !reason) return;
        setPending(true);
        try {
          const result = await completeOrder({ id: targetId, sponsorRemark: reason });
          if (result.success) {
            toastSuccess("Work order completed.");
            onClose();
            onCompleted();
          } else {
            toastError(result);
          }
        } finally {
          setPending(false);
        }
      }}
      data-testid="maintenance-orders-complete-dialog"
    />
  );
}

function CancelOrderDialog({
  targetId,
  onClose,
  onCancelled,
}: Readonly<{
  targetId: string | null;
  onClose: () => void;
  onCancelled: () => void;
}>) {
  const [pending, setPending] = React.useState(false);

  return (
    <ConfirmDialog
      open={targetId !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      intent="warning"
      title="Cancel work order"
      description="Vendor access (if any) is revoked instantly. This cannot be undone."
      requireReason
      reasonLabel="Cancellation reason *"
      reasonPlaceholder="Why is this being cancelled?"
      confirmLabel={pending ? "Cancelling…" : "Cancel order"}
      pending={pending}
      validateReason={(s) => {
        const parsed = cancelOrderSchema.safeParse({
          id: targetId ?? "00000000-0000-0000-0000-000000000000",
          reason: s,
        });
        // Reason-only validation; ID gets revalidated by the action.
        return !parsed.success
          ? parsed.error.issues.every((i) => i.path[0] !== "reason")
          : true;
      }}
      onConfirm={async (reason) => {
        if (!targetId || !reason) return;
        setPending(true);
        try {
          const result = await cancelOrder({ id: targetId, reason });
          if (result.success) {
            toastSuccess("Work order cancelled.");
            onClose();
            onCancelled();
          } else {
            toastError(result);
          }
        } finally {
          setPending(false);
        }
      }}
      data-testid="maintenance-orders-cancel-dialog"
    />
  );
}


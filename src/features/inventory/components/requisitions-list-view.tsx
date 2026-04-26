"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  useFieldArray,
  useForm,
  FormProvider,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardList,
  Plus,
  Timer,
  Hourglass,
  CalendarClock,
  Trash2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FormRow } from "@/components/ui/form-row";
import { FormSection } from "@/components/ui/form-section";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";

import type {
  RequisitionListData,
  RequisitionListRow,
  RequisitionStatusFilter,
} from "@/features/inventory/types";
import {
  createRequisitionSchema,
  type CreateRequisitionInput,
} from "@/features/inventory/schemas/create-requisition";
import { createRequisition } from "@/features/inventory/actions/create-requisition";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  pending_review: "Awaiting Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatRelative(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  return formatDuration(seconds);
}

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
  data: RequisitionListData;
  canCreate: boolean;
}>;

export function RequisitionsListView({ data, canCreate }: Props) {
  const router = useRouter();

  // Status tab — server-driven filter, drives RSC re-render via shallow:false
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("open").withOptions({
      clearOnDefault: true,
      shallow: false,
      history: "replace",
    }),
  );

  const searchFilter = useUrlString("q");
  const fromFilter = useUrlString("from");
  const toFilter = useUrlString("to");

  const filteredRows = React.useMemo(() => {
    let rows = [...data.rows];

    // Status bucket. Per design we dropped the manager-approval step from
    // WF-10 to avoid bottlenecks — `pending_review` rows (if any ever
    // appear) never surface in any tab here.
    const sf = (statusFilter ?? "open") as RequisitionStatusFilter;
    rows = rows.filter((r) => {
      switch (sf) {
        case "open":
          return r.status === "pending" || r.status === "in_progress";
        case "completed":
          return r.status === "completed";
        case "cancelled":
          return r.status === "cancelled";
      }
    });

    // Date range on created_at — params are YYYY-MM-DD strings.
    if (fromFilter.value) {
      const fromMs = new Date(fromFilter.value).getTime();
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= fromMs);
    }
    if (toFilter.value) {
      const toMs = new Date(toFilter.value).getTime() + 24 * 3600 * 1000 - 1;
      rows = rows.filter((r) => new Date(r.createdAt).getTime() <= toMs);
    }

    // Search predicate per spec line 2039: "searches to_location name,
    // material names". We additionally include from_location_name,
    // assignee display_name, and requester_remark — all of which are
    // visible columns the manager would reasonably search by.
    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.toLocationName?.toLowerCase().includes(q) ||
          r.fromLocationName.toLowerCase().includes(q) ||
          (r.assignedToName?.toLowerCase().includes(q) ?? false) ||
          (r.requesterRemark?.toLowerCase().includes(q) ?? false) ||
          r.materialNames.some((name) => name.toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [
    data.rows,
    statusFilter,
    fromFilter.value,
    toFilter.value,
    searchFilter.value,
  ]);

  const hasActiveFilters = Boolean(
    searchFilter.value || fromFilter.value || toFilter.value,
  );

  const resetAll = (): void => {
    searchFilter.set(null);
    fromFilter.set(null);
    toFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
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
        data-testid="inventory-requisitions-chip-date"
      />,
    );
  }

  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<RequisitionListRow, unknown>[]>(
    () => [
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => row.original.fromLocationName,
        meta: { headerClassName: "whitespace-nowrap" },
      },
      {
        id: "destination",
        header: "Destination",
        cell: ({ row }) => row.original.toLocationName ?? "—",
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.itemCount}</span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "totalQty",
        header: "Total Qty",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {QTY.format(row.original.totalRequestedQty)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "assignee",
        header: "Assigned To",
        cell: ({ row }) => row.original.assignedToName ?? "—",
      },
      {
        id: "requested",
        header: "Requested",
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
        id: "elapsed",
        header: "Elapsed",
        cell: ({ row }) => (
          <span className="text-foreground-muted tabular-nums">
            {formatRelative(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status ?? "pending";
          return (
            <StatusBadge
              status={s}
              label={STATUS_LABELS[s] ?? s}
              data-testid={`inventory-requisitions-row-status-${row.original.id}`}
            />
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-6"
      data-testid="inventory-requisitions-list"
    >
      <PageHeader
        title="Requisitions"
        description="Material requisition queue — review crew restock requests and create manager-side requisitions."
        data-testid="inventory-requisitions-header"
        primaryAction={
          canCreate ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="inventory-requisitions-create-btn"
            >
              <Plus aria-hidden className="size-4" /> New Requisition
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="inventory-requisitions-kpis">
        <KpiCard
          label="Oldest pending"
          value={formatDuration(data.kpis.oldestPendingSeconds)}
          caption={
            data.kpis.oldestPendingSeconds === null
              ? "no open requisitions"
              : "in queue"
          }
          icon={<Hourglass aria-hidden className="size-4" />}
          data-testid="inventory-requisitions-kpi-oldest"
        />
        <KpiCard
          label="Avg fulfillment time"
          value={formatDuration(data.kpis.avgFulfillmentSeconds)}
          caption="created → completed"
          icon={<Timer aria-hidden className="size-4" />}
          data-testid="inventory-requisitions-kpi-avg-fulfillment"
        />
        <KpiCard
          label="Requested today"
          value={data.kpis.requestedTodayCount}
          icon={<CalendarClock aria-hidden className="size-4" />}
          data-testid="inventory-requisitions-kpi-today"
        />
      </KpiCardRow>

      <StatusTabBar
        ariaLabel="Requisition status"
        paramKey="status"
        defaultValue="open"
        shallow={false}
        data-testid="inventory-requisitions-tabs"
        tabs={[
          {
            value: "open",
            label: "Open",
            count: data.counts.open,
            tone: "info",
          },
          {
            value: "completed",
            label: "Completed",
            count: data.counts.completed,
            tone: "success",
          },
          {
            value: "cancelled",
            label: "Cancelled",
            count: data.counts.cancelled,
            tone: "neutral",
          },
        ]}
        onValueChange={(v) => void setStatusFilter(v)}
      />

      <FilterableDataTable<RequisitionListRow>
        toolbar={
          <FilterBar
            data-testid="inventory-requisitions-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by location, assignee, note…"
                aria-label="Search requisitions"
                debounceMs={300}
                data-testid="inventory-requisitions-search"
              />
            }
            controls={
              <UrlDateRangePicker
                fromParam="from"
                toParam="to"
                className="min-w-[16rem] sm:w-auto"
                data-testid="inventory-requisitions-date-range"
              />
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: ["destination", "items", "status", "elapsed"],
          getRowId: (row) => row.id,
          onRowClick: (row) =>
            router.push(`/management/inventory/requisitions/${row.id}`),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          (statusFilter ?? "open") === "open" && !hasActiveFilters && canCreate ? (
            <EmptyStateCta
              variant="first-use"
              title="No open requisitions"
              description="Create a manager-side requisition or wait for crew submissions."
              icon={<ClipboardList className="size-8" />}
              frame="none"
              ctaLabel="New Requisition"
              onClick={() => setCreateOpen(true)}
              data-testid="inventory-requisitions-empty-open"
            />
          ) : (
            {
              variant: "filtered-out" as const,
              title: hasActiveFilters
                ? "No requisitions match your filters"
                : "Nothing in this tab yet",
              description: hasActiveFilters
                ? "Clear filters or try a different search."
                : "Records will appear here as they progress.",
              icon: <ClipboardList className="size-8" />,
            }
          )
        }
        data-testid="inventory-requisitions-table"
      />

      <CreateRequisitionSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        locations={data.locations}
        materials={data.materials}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

// ── Create-requisition sheet ─────────────────────────────────────────

function CreateRequisitionSheet({
  open,
  onOpenChange,
  locations,
  materials,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: RequisitionListData["locations"];
  materials: RequisitionListData["materials"];
  onCreated: () => void;
}>) {
  const form = useForm<CreateRequisitionInput>({
    resolver: zodResolver(
      createRequisitionSchema,
    ) as Resolver<CreateRequisitionInput>,
    defaultValues: {
      fromLocationId: "",
      toLocationId: "",
      requesterRemark: null,
      items: [{ materialId: "", requestedQty: 1 }],
      idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        fromLocationId: "",
        toLocationId: "",
        requesterRemark: null,
        items: [{ materialId: "", requestedQty: 1 }],
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
      });
    }
  }, [open, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (
    values: CreateRequisitionInput,
  ): Promise<void> => {
    setPending(true);
    try {
      const result = await createRequisition(values);
      if (result.success) {
        toastSuccess("Requisition created", {
          description: `${values.items.length} line item${values.items.length === 1 ? "" : "s"}`,
        });
        onOpenChange(false);
        onCreated();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            // RHF accepts dotted paths for field-array errors.
            form.setError(field as never, { type: "server", message });
          }
        }
      }
    } finally {
      setPending(false);
    }
  };

  const materialOptions = React.useMemo(
    () =>
      materials.map((m) => ({
        value: m.id,
        label: m.sku ? `${m.name} (${m.sku})` : m.name,
        description: m.isConsumable ? "Consumable" : "Transferable",
      })),
    [materials],
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Requisition"
      description="Source materials from one location to another. Movement type per line is auto-derived from the material's category."
      formId="inventory-requisitions-create-form"
      submitLabel="Create"
      pending={pending}
      submitDisabled={pending}
      width="lg"
      data-testid="inventory-requisitions-create-sheet"
    >
      <FormProvider {...form}>
        <form
          id="inventory-requisitions-create-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Routing">
            <FormRow>
              <FormField
                control={form.control}
                name="fromLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From location *</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger data-testid="inventory-requisitions-create-from">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Source
                        </SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To location *</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger data-testid="inventory-requisitions-create-to">
                          <SelectValue placeholder="Destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Destination
                        </SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={form.control}
              name="requesterRemark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value,
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      rows={2}
                      placeholder="Context for the runner"
                      data-testid="inventory-requisitions-create-remark"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection
            title="Line items"
            description="At least one. Movement type is auto-mapped per material."
          >
            <ul
              className="flex flex-col gap-3"
              data-testid="inventory-requisitions-create-items"
            >
              {fields.map((field, index) => (
                <li
                  key={field.id}
                  className="border-border-subtle bg-surface/40 flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-start"
                  data-testid={`inventory-requisitions-create-item-${index}`}
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.materialId` as const}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Material *</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={f.value || null}
                            onChange={(v) => f.onChange(v ?? "")}
                            options={materialOptions}
                            placeholder="Pick a material"
                            searchPlaceholder="Search…"
                            data-testid={`inventory-requisitions-create-item-${index}-material`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.requestedQty` as const}
                    render={({ field: f }) => (
                      <FormItem className="w-full sm:w-32">
                        <FormLabel className="text-xs">Qty *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={typeof f.value === "number" ? f.value : ""}
                            onChange={(e) =>
                              f.onChange(parseFloat(e.target.value) || 0)
                            }
                            onBlur={f.onBlur}
                            name={f.name}
                            ref={f.ref}
                            data-testid={`inventory-requisitions-create-item-${index}-qty`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label="Remove item"
                    data-testid={`inventory-requisitions-create-item-${index}-remove`}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ materialId: "", requestedQty: 1 })}
              data-testid="inventory-requisitions-create-add-item"
            >
              <Plus aria-hidden className="size-4" /> Add line
            </Button>
          </FormSection>
        </form>
      </FormProvider>
    </FormSheet>
  );
}

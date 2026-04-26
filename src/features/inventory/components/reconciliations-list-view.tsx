"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  useForm,
  FormProvider,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ScanLine,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import { MultiSelect } from "@/components/ui/multi-select";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  ReconciliationListData,
  ReconciliationListRow,
  ReconciliationStatusFilter,
} from "@/features/inventory/types";
import {
  scheduleReconciliationSchema,
  type ScheduleReconciliationInput,
} from "@/features/inventory/schemas/schedule-reconciliation";
import { scheduleReconciliation } from "@/features/inventory/actions/schedule-reconciliation";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  pending_review: "Awaiting Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatScheduled(date: string, time: string): string {
  // scheduledDate = YYYY-MM-DD, scheduledTime = HH:MM:SS — strip seconds for display.
  const t = time.length >= 5 ? time.slice(0, 5) : time;
  return `${date} · ${t}`;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

type Props = Readonly<{
  data: ReconciliationListData;
  canCreate: boolean;
}>;

export function ReconciliationsListView({ data, canCreate }: Props) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("active").withOptions({
      clearOnDefault: true,
      shallow: false,
      history: "replace",
    }),
  );
  const searchFilter = useUrlString("q");
  const locationFilter = useUrlString("location");

  const filteredRows = React.useMemo(() => {
    let rows = [...data.rows];

    const sf = (statusFilter ?? "active") as ReconciliationStatusFilter;
    rows = rows.filter((r) => {
      switch (sf) {
        case "active":
          return r.status === "pending" || r.status === "in_progress";
        case "pending_review":
          return r.status === "pending_review";
        case "completed":
          return r.status === "completed";
        case "cancelled":
          return r.status === "cancelled";
      }
    });

    if (locationFilter.value) {
      rows = rows.filter((r) => r.locationId === locationFilter.value);
    }
    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.locationName.toLowerCase().includes(q) ||
          (r.assignedToName?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [data.rows, statusFilter, locationFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value || locationFilter.value);

  const resetAll = (): void => {
    searchFilter.set(null);
    locationFilter.set(null);
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
        data-testid="inventory-reconciliation-chip-location"
      />,
    );
  }

  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<
    ColumnDef<ReconciliationListRow, unknown>[]
  >(
    () => [
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.locationName}
          </span>
        ),
      },
      {
        id: "scheduled",
        header: "Scheduled",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatScheduled(
              row.original.scheduledDate,
              row.original.scheduledTime,
            )}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "assignee",
        header: "Runner",
        cell: ({ row }) => row.original.assignedToName ?? "—",
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
        id: "discrepancies",
        header: "Discrepancies",
        cell: ({ row }) =>
          row.original.discrepancyFound ? (
            <StatusBadge
              status="warning"
              tone="warning"
              variant="outline"
              label="Found"
              data-testid={`inventory-reconciliation-row-discrepancy-${row.original.id}`}
            />
          ) : (
            <span className="text-foreground-muted text-sm">—</span>
          ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-center",
          cellClassName: "w-0 whitespace-nowrap text-center",
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
              data-testid={`inventory-reconciliation-row-status-${row.original.id}`}
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

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="inventory-reconciliations-list"
    >
      <PageHeader
        title="Stock Reconciliation"
        description="Schedule blind audits, review counts, and approve adjustments."
        data-testid="inventory-reconciliations-header"
        primaryAction={
          canCreate ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="inventory-reconciliations-create-btn"
            >
              <Plus aria-hidden className="size-4" /> Schedule Count
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="inventory-reconciliations-kpis">
        <KpiCard
          label="Pending review"
          value={QTY.format(data.kpis.pendingReviewCount)}
          caption="awaiting manager"
          icon={<Clock aria-hidden className="size-4" />}
          data-testid="inventory-reconciliations-kpi-pending-review"
        />
        <KpiCard
          label="Discrepancies this month"
          value={QTY.format(data.kpis.discrepanciesThisMonthCount)}
          caption="approved with variance"
          icon={<AlertTriangle aria-hidden className="size-4" />}
          {...(data.kpis.discrepanciesThisMonthCount > 0
            ? {
                trend: {
                  direction: "up" as const,
                  label: "vs zero target",
                  goodWhen: "down" as const,
                },
              }
            : {})}
          data-testid="inventory-reconciliations-kpi-discrepancies"
        />
        <KpiCard
          label="Completed this month"
          value={QTY.format(data.kpis.completedThisMonthCount)}
          caption="approved counts"
          icon={<CheckCircle2 aria-hidden className="size-4" />}
          data-testid="inventory-reconciliations-kpi-completed"
        />
      </KpiCardRow>

      <StatusTabBar
        ariaLabel="Reconciliation status"
        paramKey="status"
        defaultValue="active"
        shallow={false}
        data-testid="inventory-reconciliations-tabs"
        tabs={[
          {
            value: "active",
            label: "Active",
            count: data.counts.active,
            tone: "info",
          },
          {
            value: "pending_review",
            label: "Pending Review",
            count: data.counts.pendingReview,
            tone: "warning",
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

      <FilterableDataTable<ReconciliationListRow>
        toolbar={
          <FilterBar
            data-testid="inventory-reconciliations-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by location or runner…"
                aria-label="Search reconciliations"
                debounceMs={300}
                data-testid="inventory-reconciliations-search"
              />
            }
            controls={
              <Select
                value={locationFilter.value ?? "__all__"}
                onValueChange={(next) =>
                  locationFilter.set(next === "__all__" ? null : next)
                }
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Location"
                  data-testid="inventory-reconciliations-filter-location"
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
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: [
            "location",
            "scheduled",
            "items",
            "status",
          ],
          getRowId: (row) => row.id,
          onRowClick: (row) =>
            router.push(`/management/inventory/reconciliation/${row.id}`),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          (statusFilter ?? "active") === "active" &&
          !hasActiveFilters &&
          canCreate ? (
            <EmptyStateCta
              variant="first-use"
              title="No active stock counts"
              description="Schedule a blind audit to get started."
              icon={<ScanLine className="size-8" />}
              frame="none"
              ctaLabel="Schedule Count"
              onClick={() => setCreateOpen(true)}
              data-testid="inventory-reconciliations-empty-active"
            />
          ) : (
            {
              variant: "filtered-out" as const,
              title: hasActiveFilters
                ? "No reconciliations match your filters"
                : "Nothing in this tab yet",
              description: hasActiveFilters
                ? "Clear filters or try a different search."
                : "Records will appear here as counts progress.",
              icon: <ScanLine className="size-8" />,
            }
          )
        }
        data-testid="inventory-reconciliations-table"
      />

      <ScheduleReconciliationSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        data={data}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

// ── Schedule sheet ───────────────────────────────────────────────────

function ScheduleReconciliationSheet({
  open,
  onOpenChange,
  data,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReconciliationListData;
  onCreated: () => void;
}>) {
  const form = useForm<ScheduleReconciliationInput>({
    resolver: zodResolver(
      scheduleReconciliationSchema,
    ) as Resolver<ScheduleReconciliationInput>,
    defaultValues: {
      locationId: "",
      scheduledDate: todayDateString(),
      scheduledTime: nowTimeString(),
      assignedToId: "",
      managerRemark: null,
      materialIds: [],
      idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        locationId: "",
        scheduledDate: todayDateString(),
        scheduledTime: nowTimeString(),
        assignedToId: "",
        managerRemark: null,
        materialIds: [],
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
      });
    }
  }, [open, form]);

  const selectedLocation = form.watch("locationId");
  const selectedMaterialIds = form.watch("materialIds");

  // Material options are unfiltered — manager may want to count any
  // active material at any location. The system_qty preview below the
  // picker tells them the current cache value at the chosen location.
  const materialOptions = React.useMemo(
    () =>
      data.materials.map((m) => ({
        value: m.id,
        label: m.sku ? `${m.name} (${m.sku})` : m.name,
        ...(m.baseUnitAbbreviation
          ? { description: m.baseUnitAbbreviation }
          : {}),
      })),
    [data.materials],
  );

  const assigneeOptions = React.useMemo(
    () =>
      data.assignees.map((a) => ({
        value: a.userId,
        label: a.displayName,
      })),
    [data.assignees],
  );

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (
    values: ScheduleReconciliationInput,
  ): Promise<void> => {
    setPending(true);
    try {
      const result = await scheduleReconciliation(values);
      if (result.success) {
        toastSuccess("Stock count scheduled", {
          description: `${values.materialIds.length} material${values.materialIds.length === 1 ? "" : "s"}`,
        });
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
      title="Schedule Stock Count"
      description="Assign a runner to a blind count. The system_qty snapshot is captured per material at the chosen location."
      formId="inventory-reconciliations-create-form"
      submitLabel="Schedule"
      pending={pending}
      submitDisabled={pending}
      width="lg"
      data-testid="inventory-reconciliations-create-sheet"
    >
      <FormProvider {...form}>
        <form
          id="inventory-reconciliations-create-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Audit">
            <FormRow>
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger data-testid="inventory-reconciliations-create-location">
                          <SelectValue placeholder="Pick a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Pick a location
                        </SelectItem>
                        {data.locations.map((l) => (
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
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Runner *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || null}
                        onChange={(v) => field.onChange(v ?? "")}
                        options={assigneeOptions}
                        placeholder="Pick a runner"
                        searchPlaceholder="Search staff…"
                        data-testid="inventory-reconciliations-create-runner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormRow>
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="inventory-reconciliations-create-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        data-testid="inventory-reconciliations-create-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={form.control}
              name="managerRemark"
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
                      data-testid="inventory-reconciliations-create-remark"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection
            title="Materials to count"
            description="The runner sees materials and units, but not system_qty (blind count)."
          >
            <FormField
              control={form.control}
              name="materialIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Materials *</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={materialOptions}
                      placeholder="Pick materials to count…"
                      searchPlaceholder="Search…"
                      data-testid="inventory-reconciliations-create-materials"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedLocation && selectedMaterialIds.length > 0 ? (
              <SystemQtyPreview
                locationId={selectedLocation}
                materialIds={selectedMaterialIds}
                data={data}
                onRemove={(materialId) =>
                  form.setValue(
                    "materialIds",
                    selectedMaterialIds.filter((id) => id !== materialId),
                    { shouldDirty: true },
                  )
                }
              />
            ) : null}
          </FormSection>
        </form>
      </FormProvider>
    </FormSheet>
  );
}

function SystemQtyPreview({
  locationId,
  materialIds,
  data,
  onRemove,
}: Readonly<{
  locationId: string;
  materialIds: ReadonlyArray<string>;
  data: ReconciliationListData;
  onRemove: (materialId: string) => void;
}>) {
  const materialMap = React.useMemo(() => {
    const map = new Map<string, (typeof data.materials)[number]>();
    for (const m of data.materials) map.set(m.id, m);
    return map;
  }, [data.materials]);

  return (
    <div
      className="border-border-subtle bg-surface/40 flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm"
      data-testid="inventory-reconciliations-create-snapshot"
    >
      <p className="text-foreground-muted text-xs font-medium uppercase tracking-wide">
        System qty snapshot at creation
      </p>
      <ul className="divide-border-subtle flex flex-col divide-y">
        {materialIds.map((materialId) => {
          const m = materialMap.get(materialId);
          const qty =
            data.stockByMaterialLocation[`${materialId}:${locationId}`] ?? 0;
          return (
            <li
              key={materialId}
              className="flex items-center justify-between gap-3 py-1.5"
              data-testid={`inventory-reconciliations-create-snapshot-row-${materialId}`}
            >
              <span className="text-foreground truncate">
                {m?.name ?? "Unknown"}
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-foreground">
                  {QTY.format(qty)}
                  {m?.baseUnitAbbreviation ? (
                    <span className="text-foreground-muted ml-1">
                      {m.baseUnitAbbreviation}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={() => onRemove(materialId)}
                  aria-label="Remove material"
                  data-testid={`inventory-reconciliations-create-snapshot-remove-${materialId}`}
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

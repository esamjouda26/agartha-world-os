"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Monitor, ShoppingCart, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { PosPointsData, PosPointRow } from "@/features/pos/types/management";
import { upsertPosPoint } from "@/features/pos/actions/upsert-pos-point";
import { formatCents } from "@/lib/money";
import { upsertPosPointSchema, type UpsertPosPointInput } from "@/features/pos/schemas/pos-point";
import type { FieldPath } from "react-hook-form";

// ── Constants ───────────────────────────────────────────────────────────

const SEARCH_PARAM = "q";
const STATUS_PARAM = "status";
const LOCATION_PARAM = "location";

const MOBILE_COLUMNS = ["displayName", "isActive", "orderCountToday"] as const;

const STATUS_VALUES = ["active", "inactive"] as const;
type StatusFilter = (typeof STATUS_VALUES)[number];
const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "Active",
  inactive: "Inactive",
};

// ── Formatters ──────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return format(parseISO(iso), "HH:mm");
}

// ── Props ───────────────────────────────────────────────────────────────

type PosPointsViewProps = Readonly<{
  data: PosPointsData;
  canWrite: boolean;
}>;

// ── Inner form ───────────────────────────────────────────────────────────

type PosPointFormProps = Readonly<{
  defaultValues: UpsertPosPointInput;
  locations: ReadonlyArray<{ id: string; name: string }>;
  onSuccess: () => void;
}>;

function PosPointForm({ defaultValues, locations, onSuccess }: PosPointFormProps) {
  const form = useForm<UpsertPosPointInput>({
    resolver: zodResolver(upsertPosPointSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertPosPointInput) {
    const res = await upsertPosPoint(values);
    if (res.success) {
      toastSuccess(defaultValues.id ? "POS point updated." : "POS point created.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertPosPointInput>, { type: "server", message });
      }
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-5"
        data-testid="pos-point-form"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. main-bar" data-testid="pos-point-form-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Main Bar"
                  data-testid="pos-point-form-display-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="pos-point-form-location">
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
          name="isActive"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    id="pos-point-is-active"
                    data-testid="pos-point-form-is-active"
                  />
                </FormControl>
                <Label htmlFor="pos-point-is-active">Active</Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton data-testid="pos-point-form-submit">
          {defaultValues.id ? "Update POS point" : "Create POS point"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Main view ────────────────────────────────────────────────────────────

export function PosPointsView({ data, canWrite }: PosPointsViewProps) {
  const router = useRouter();
  const search = useUrlString(SEARCH_PARAM);
  const statusFilter = useUrlString(STATUS_PARAM);
  const locationFilter = useUrlString(LOCATION_PARAM);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PosPointRow | null>(null);

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }

  function openEdit(row: PosPointRow) {
    setEditTarget(row);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }

  function handleSuccess() {
    setSheetOpen(false);
    setEditTarget(null);
    router.refresh();
  }

  // ── Filter logic ─────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = [...data.rows];

    if (statusFilter.value === "active") {
      result = result.filter((r) => r.isActive);
    } else if (statusFilter.value === "inactive") {
      result = result.filter((r) => !r.isActive);
    }

    if (locationFilter.value) {
      result = result.filter((r) => r.locationId === locationFilter.value);
    }

    const q = search.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.displayName.toLowerCase().includes(q) ||
          (r.locationName ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [data.rows, search.value, statusFilter.value, locationFilter.value]);

  const hasActiveFilters = Boolean(search.value || statusFilter.value || locationFilter.value);

  const resetAll = () => {
    search.set(null);
    statusFilter.set(null);
    locationFilter.set(null);
  };

  // ── Filter chips ──────────────────────────────────────────────────────
  const chips: React.ReactNode[] = [];
  if (statusFilter.value && STATUS_VALUES.includes(statusFilter.value as StatusFilter)) {
    chips.push(
      <FilterChip
        key="status"
        name="Status"
        label={STATUS_LABELS[statusFilter.value as StatusFilter]}
        onRemove={() => statusFilter.set(null)}
        data-testid="pos-points-chip-status"
      />,
    );
  }
  if (locationFilter.value) {
    const locName = data.locations.find((l) => l.id === locationFilter.value)?.name;
    chips.push(
      <FilterChip
        key="location"
        name="Location"
        label={locName ?? locationFilter.value}
        onRemove={() => locationFilter.set(null)}
        data-testid="pos-points-chip-location"
      />,
    );
  }

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<PosPointRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Internal name",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-xs">{row.original.name}</span>
        ),
      },
      {
        id: "displayName",
        accessorKey: "displayName",
        header: "Display name",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.displayName}</span>
        ),
      },
      {
        id: "locationName",
        accessorKey: "locationName",
        header: "Location",
        cell: ({ row }) => row.original.locationName ?? "—",
      },
      {
        id: "orderCountToday",
        accessorKey: "orderCountToday",
        header: "Orders today",
      },
      {
        id: "lastOrderAt",
        accessorKey: "lastOrderAt",
        header: "Last order",
        cell: ({ row }) => formatTime(row.original.lastOrderAt),
      },
      {
        id: "revenueToday",
        accessorKey: "revenueToday",
        header: "Revenue today",
        cell: ({ row }) => formatCents(row.original.revenueToday),
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "active" : "offline"}
            label={row.original.isActive ? "Active" : "Inactive"}
            data-testid={`pos-point-status-${row.original.id}`}
          />
        ),
      },
      ...(canWrite
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: PosPointRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(row.original);
                  }}
                  data-testid={`pos-point-edit-${row.original.id}`}
                  aria-label={`Edit ${row.original.displayName}`}
                >
                  <Edit className="size-4" aria-hidden />
                </Button>
              ),
            },
          ] satisfies ColumnDef<PosPointRow>[])
        : []),
    ],
    [canWrite],
  );

  const defaultFormValues: UpsertPosPointInput = editTarget
    ? {
        id: editTarget.id,
        name: editTarget.name,
        displayName: editTarget.displayName,
        locationId: editTarget.locationId,
        isActive: editTarget.isActive,
      }
    : {
        name: "",
        displayName: "",
        locationId: data.locations[0]?.id ?? "",
        isActive: true,
      };

  return (
    <div className="flex flex-col gap-6" data-testid="pos-points-view">
      <PageHeader
        title="POS Points"
        description="Configure registers and terminals where sales occur."
        data-testid="pos-points-header"
        primaryAction={
          canWrite ? (
            <Button onClick={openCreate} data-testid="pos-point-create-btn">
              <Plus aria-hidden className="size-4" />
              New terminal
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<PosPointRow>
        kpis={
          <KpiCardRow data-testid="pos-points-kpis">
            <KpiCard
              label="Active terminals"
              value={`${data.kpis.activeCount}/${data.kpis.totalCount}`}
              icon={<Monitor aria-hidden className="size-4" />}
              data-testid="pos-kpi-active"
            />
            <KpiCard
              label="Today's orders"
              value={data.kpis.ordersToday}
              icon={<ShoppingCart aria-hidden className="size-4" />}
              data-testid="pos-kpi-orders"
            />
            <KpiCard
              label="Today's revenue"
              value={formatCents(data.kpis.revenueToday)}
              icon={<DollarSign aria-hidden className="size-4" />}
              data-testid="pos-kpi-revenue"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="pos-points-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search by name or location…"
                aria-label="Search POS points"
                debounceMs={300}
                data-testid="pos-points-search"
              />
            }
            controls={
              <>
                <Select
                  value={statusFilter.value ?? "all"}
                  onValueChange={(next) => statusFilter.set(next === "all" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Status"
                    data-testid="pos-points-filter-status"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={locationFilter.value ?? "all"}
                  onValueChange={(next) => locationFilter.set(next === "all" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Location"
                    data-testid="pos-points-filter-location"
                  >
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
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
          data: filtered,
          columns,
          mobileFieldPriority: MOBILE_COLUMNS,
          getRowId: (row) => row.id,
          onRowClick: (row) => router.push(`/management/pos/${row.id}`),
          "data-testid": "pos-points-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No terminals match your filters.", variant: "filtered-out" }
            : { title: "No POS points configured yet.", variant: "first-use" }
        }
        data-testid="pos-points-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit POS point" : "New POS point"}
        description={
          editTarget ? `Editing "${editTarget.displayName}"` : "Create a new register or terminal."
        }
        hideFooter
        data-testid="pos-point-sheet"
      >
        <PosPointForm
          key={editTarget?.id ?? "create"}
          defaultValues={defaultFormValues}
          locations={data.locations}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </div>
  );
}

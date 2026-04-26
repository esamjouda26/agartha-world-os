"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Truck, Plus, Wrench, AlertTriangle, Trash2, CalendarClock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { StatusTabBar, type StatusTabDefinition } from "@/components/ui/status-tab-bar";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { VehiclePageData, VehicleRow } from "@/features/operations/queries/get-vehicles";
import {
  createVehicleSchema,
  updateVehicleSchema,
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  type CreateVehicleInput,
  type VehicleStatus,
} from "@/features/operations/schemas/vehicle";
import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/features/operations/actions/vehicle-actions";

// ── Constants ──────────────────────────────────────────────────────────

/** Sentinel for "no zone" so Radix Select never receives an empty string value. */
const NO_ZONE = "__none__";

// ── Props ──────────────────────────────────────────────────────────────

type VehicleFleetViewProps = Readonly<{
  data: VehiclePageData;
  canWrite: boolean;
  canDelete: boolean;
}>;

function statusBadgeVariant(s: VehicleStatus): "outline" | "secondary" | "destructive" {
  if (s === "active") return "outline";
  if (s === "maintenance") return "secondary";
  return "destructive";
}

function statusTone(s: VehicleStatus): "success" | "warning" | "danger" {
  if (s === "active") return "success";
  if (s === "maintenance") return "warning";
  return "danger";
}

// ── Main View ──────────────────────────────────────────────────────────

export function VehicleFleetView({ data, canWrite, canDelete }: VehicleFleetViewProps) {
  const searchFilter = useUrlString("q");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VehicleRow | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<CreateVehicleInput>({
    resolver: zodResolver(
      editing ? updateVehicleSchema : createVehicleSchema,
    ) as Resolver<CreateVehicleInput>,
    defaultValues: { name: "", plate: null, vehicleType: null, status: "active", zoneId: null },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", plate: null, vehicleType: null, status: "active", zoneId: null });
    setSheetOpen(true);
  };
  const openEdit = (row: VehicleRow) => {
    setEditing(row);
    form.reset({
      name: row.name,
      plate: row.plate,
      vehicleType: row.vehicleType,
      status: row.status,
      zoneId: row.zoneId,
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (values: CreateVehicleInput) => {
    setPending(true);
    try {
      const result = editing
        ? await updateVehicle({ ...values, id: editing.id })
        : await createVehicle(values);
      if (result.success) {
        toastSuccess(editing ? "Vehicle updated" : "Vehicle added");
        setSheetOpen(false);
        form.reset();
      } else toastError(result);
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle? This action cannot be undone.")) return;
    const result = await deleteVehicle(id);
    if (result.success) {
      toastSuccess("Vehicle deleted");
      setSheetOpen(false);
    } else toastError(result);
  };

  // ── Status tabs (nuqs-backed via StatusTabBar) ──────────────────────

  const statusCounts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of data.vehicles) c[v.status] = (c[v.status] ?? 0) + 1;
    return c;
  }, [data.vehicles]);

  const statusTabs: StatusTabDefinition[] = VEHICLE_STATUSES.map((s) => ({
    value: s,
    label: VEHICLE_STATUS_LABELS[s],
    count: statusCounts[s] ?? 0,
    tone: statusTone(s),
  }));

  // StatusTabBar writes to `?status=` via nuqs. Read it here for filtering.
  const statusFilter = useUrlString("status");
  const activeStatus = (statusFilter.value ?? "active") as VehicleStatus;

  const filtered = React.useMemo(() => {
    let result = data.vehicles.filter((v) => v.status === activeStatus);
    const q = searchFilter.value?.toLowerCase();
    if (q)
      result = result.filter(
        (v) => v.name.toLowerCase().includes(q) || (v.plate?.toLowerCase().includes(q) ?? false),
      );
    return result;
  }, [data.vehicles, activeStatus, searchFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value);
  const resetAll = () => {
    searchFilter.set(null);
  };

  const columns = React.useMemo<ColumnDef<VehicleRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
      },
      {
        id: "plate",
        accessorKey: "plate",
        header: "Plate",
        cell: ({ row }) => row.original.plate ?? "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "type",
        accessorKey: "vehicleType",
        header: "Type",
        cell: ({ row }) => row.original.vehicleType ?? "—",
      },
      {
        id: "zone",
        accessorKey: "zoneName",
        header: "Zone",
        cell: ({ row }) => row.original.zoneName ?? "—",
      },
      {
        id: "lastMaintenance",
        accessorKey: "lastMaintenanceDate",
        header: "Last Maintenance",
        cell: ({ row }) =>
          row.original.lastMaintenanceDate
            ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                new Date(row.original.lastMaintenanceDate),
              )
            : "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {VEHICLE_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        meta: { headerClassName: "w-0", cellClassName: "w-0" },
      },
    ],
    [],
  );

  const formattedNextWo = data.kpis.nextScheduledWoDate
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(data.kpis.nextScheduledWoDate),
      )
    : "None Scheduled";

  return (
    <div className="flex flex-col gap-6" data-testid="vehicle-fleet-page">
      <PageHeader
        eyebrow="Operations"
        title="Vehicle Fleet"
        description="Manage the facility vehicle fleet registry."
        {...(canWrite
          ? {
              primaryAction: (
                <Button size="sm" onClick={openCreate} data-testid="vehicle-add-btn">
                  <Plus aria-hidden className="size-4" />
                  Add Vehicle
                </Button>
              ),
            }
          : {})}
        data-testid="vehicle-header"
      />

      <FilterableDataTable<VehicleRow>
        kpis={
          <KpiCardRow data-testid="vehicle-kpis">
            <KpiCard
              label="Active"
              value={data.kpis.activeCount}
              caption="available"
              icon={<Truck aria-hidden className="size-4" />}
              data-testid="vehicle-kpi-active"
            />
            <KpiCard
              label="In Maintenance"
              value={data.kpis.maintenanceCount}
              caption="undergoing work"
              icon={<Wrench aria-hidden className="size-4" />}
              data-testid="vehicle-kpi-maintenance"
            />
            <KpiCard
              label="Retired"
              value={data.kpis.retiredCount}
              caption="decommissioned"
              icon={<AlertTriangle aria-hidden className="size-4" />}
              data-testid="vehicle-kpi-retired"
            />
            <KpiCard
              label="Next Scheduled WO"
              value={formattedNextWo}
              caption="earliest upcoming"
              icon={<CalendarClock aria-hidden className="size-4" />}
              data-testid="vehicle-kpi-next-wo"
            />
          </KpiCardRow>
        }
        toolbar={
          <>
            <StatusTabBar
              tabs={statusTabs}
              paramKey="status"
              defaultValue="active"
              ariaLabel="Vehicle status filter"
              size="compact"
              fill="natural"
              data-testid="vehicle-status-tabs"
            />
            <FilterBar
              data-testid="vehicle-filters"
              hasActiveFilters={hasActiveFilters}
              onClearAll={resetAll}
              search={
                <UrlSearchInput
                  param="q"
                  placeholder="Search by name or plate…"
                  aria-label="Search vehicles"
                  debounceMs={300}
                  data-testid="vehicle-search"
                />
              }
            />
          </>
        }
        table={{
          data: filtered,
          columns,
          mobileFieldPriority: ["name", "plate", "status"],
          getRowId: (r) => r.id,
          ...(canWrite ? { onRowClick: openEdit } : {}),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: hasActiveFilters ? "filtered-out" : "first-use",
          title: "No vehicles found",
          description: hasActiveFilters
            ? "Clear filters to see all vehicles."
            : "Add your first vehicle to the fleet.",
          icon: <Truck className="size-8" />,
        }}
        data-testid="vehicle-table"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit Vehicle" : "Add Vehicle"}
        description="Manage vehicle details and assignment."
        formId="vehicle-form"
        submitLabel={editing ? "Save" : "Add"}
        pending={pending}
        submitDisabled={pending}
        width="md"
        data-testid="vehicle-sheet"
        {...(editing && canDelete
          ? {
              footer: (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(editing.id)}
                  data-testid="vehicle-delete-btn"
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ),
            }
          : {})}
      >
        <FormProvider {...form}>
          <form
            id="vehicle-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Vehicle Details">
              <FormRow>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="vehicle-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plate</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="vehicle-plate"
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
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="e.g. Golf cart, ATV"
                          data-testid="vehicle-type"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="vehicle-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VEHICLE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {VEHICLE_STATUS_LABELS[s]}
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
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Zone</FormLabel>
                    <Select
                      value={field.value ?? NO_ZONE}
                      onValueChange={(v) => field.onChange(v === NO_ZONE ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="vehicle-zone">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ZONE}>None</SelectItem>
                        {data.zones.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>
    </div>
  );
}

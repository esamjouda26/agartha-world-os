"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, CalendarClock, UserPlus, UserMinus, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { StaffListData, StaffRow } from "@/features/hr/types/staff";
import { createStaff } from "@/features/hr/actions/create-staff";
import { createStaffSchema, type CreateStaffInput } from "@/features/hr/schemas/staff";

// ── Constants ──────────────────────────────────────────────────────────

const EMPLOYMENT_STATUSES = ["active", "pending", "on_leave", "suspended", "terminated"] as const;
type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

const STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  pending: "Pending",
  on_leave: "On Leave",
  suspended: "Suspended",
  terminated: "Terminated",
};

// ── Props ──────────────────────────────────────────────────────────────

type StaffListViewProps = Readonly<{
  data: StaffListData;
  canWrite: boolean;
  orgUnits: ReadonlyArray<{ id: string; name: string }>;
  locale: string;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function StaffListView({ data, canWrite, orgUnits, locale: _locale }: StaffListViewProps) {
  const router = useRouter();
  const statusFilter = useUrlString("status");
  const orgUnitFilter = useUrlString("org_unit");
  const searchFilter = useUrlString("q");

  const [newHireOpen, setNewHireOpen] = React.useState(false);

  // ── Filter data ────────────────────────────────────────────────────
  const filteredStaff = React.useMemo(() => {
    let result = [...data.staff];

    // Status filter (default: active)
    const activeStatus = statusFilter.value ?? "active";
    if (activeStatus && EMPLOYMENT_STATUSES.includes(activeStatus as EmploymentStatus)) {
      result = result.filter((s) => s.employmentStatus === activeStatus);
    }

    // Org unit filter
    if (orgUnitFilter.value) {
      result = result.filter((s) => s.orgUnitId === orgUnitFilter.value);
    }

    // Search filter
    const q = searchFilter.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.legalName.toLowerCase().includes(q) ||
          (s.employeeId?.toLowerCase().includes(q) ?? false),
      );
    }

    // Sort by display_name ASC
    result.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return result;
  }, [data.staff, statusFilter.value, orgUnitFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(
    (statusFilter.value && statusFilter.value !== "active") ||
    orgUnitFilter.value ||
    searchFilter.value,
  );

  const resetAll = (): void => {
    statusFilter.set(null);
    orgUnitFilter.set(null);
    searchFilter.set(null);
  };

  // ── Status tab counts ──────────────────────────────────────────────
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of data.staff) {
      counts[s.employmentStatus] = (counts[s.employmentStatus] ?? 0) + 1;
    }
    return counts;
  }, [data.staff]);

  // ── Filter chips ──────────────────────────────────────────────────
  const chips: React.ReactNode[] = [];
  if (statusFilter.value && statusFilter.value !== "active") {
    chips.push(
      <FilterChip
        key="status"
        name="Status"
        label={STATUS_LABELS[statusFilter.value as EmploymentStatus] ?? statusFilter.value}
        onRemove={() => statusFilter.set(null)}
        data-testid="hr-filter-chip-status"
      />,
    );
  }
  if (orgUnitFilter.value) {
    const ouName = orgUnits.find((ou) => ou.id === orgUnitFilter.value)?.name;
    chips.push(
      <FilterChip
        key="org_unit"
        name="Org Unit"
        label={ouName ?? orgUnitFilter.value}
        onRemove={() => orgUnitFilter.set(null)}
        data-testid="hr-filter-chip-orgunit"
      />,
    );
  }

  // ── Columns ────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<StaffRow, unknown>[]>(
    () => [
      {
        id: "displayName",
        accessorKey: "displayName",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.displayName}</span>
        ),
      },
      {
        id: "employeeId",
        accessorKey: "employeeId",
        header: "Employee ID",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-sm">
            {row.original.employeeId ?? "—"}
          </span>
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "role",
        accessorKey: "roleName",
        header: "Role",
        cell: ({ row }) => row.original.roleName ?? "—",
      },
      {
        id: "orgUnit",
        accessorKey: "orgUnitName",
        header: "Org Unit",
        cell: ({ row }) => row.original.orgUnitName ?? "—",
      },
      {
        id: "contractStart",
        accessorKey: "contractStart",
        header: "Contract Start",
        cell: ({ row }) =>
          row.original.contractStart
            ? format(parseISO(row.original.contractStart), "dd MMM yyyy")
            : "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "contractEnd",
        accessorKey: "contractEnd",
        header: "Contract End",
        cell: ({ row }) =>
          row.original.contractEnd
            ? format(parseISO(row.original.contractEnd), "dd MMM yyyy")
            : "—",
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [],
  );

  // ── New Hire Form ──────────────────────────────────────────────────
  const form = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      legalName: "",
      personalEmail: "",
      phone: "",
      address: "",
      orgUnitId: "",
      contractStart: "",
      contractEnd: "",
      kinName: "",
      kinRelationship: "",
      kinPhone: "",
    },
  });

  const [pending, setPending] = React.useState(false);

  const handleCreate = async (values: CreateStaffInput): Promise<void> => {
    setPending(true);
    try {
      const result = await createStaff(values);
      if (result.success) {
        toastSuccess("Staff record created", {
          description: "An IAM provisioning request has been created automatically.",
        });
        setNewHireOpen(false);
        form.reset();
      } else {
        toastError(result);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="hr-staff-list">
      <PageHeader
        title="Staff Management"
        description="Manage staff records, view org chart, and initiate new hires."
        data-testid="hr-staff-header"
        primaryAction={
          canWrite ? (
            <Button size="sm" onClick={() => setNewHireOpen(true)} data-testid="hr-new-hire-btn">
              <UserPlus aria-hidden className="size-4" />
              New Hire
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<StaffRow>
        kpis={
          <KpiCardRow data-testid="hr-kpis">
            <KpiCard
              label="Active"
              value={data.kpis.activeCount}
              caption="current staff"
              icon={<Users aria-hidden className="size-4" />}
              data-testid="hr-kpi-active"
            />
            <KpiCard
              label="On Leave"
              value={data.kpis.onLeaveCount}
              caption="away from work"
              icon={<Clock aria-hidden className="size-4" />}
              data-testid="hr-kpi-onleave"
            />
            <KpiCard
              label="Pending Onboard"
              value={data.kpis.pendingCount}
              caption="awaiting IT"
              icon={<UserPlus aria-hidden className="size-4" />}
              data-testid="hr-kpi-pending"
            />
            <KpiCard
              label="Expiring ≤30d"
              value={data.kpis.expiringCount}
              caption="contracts ending"
              icon={<CalendarClock aria-hidden className="size-4" />}
              {...(data.kpis.expiringCount > 0
                ? {
                    trend: {
                      direction: "up" as const,
                      label: `${data.kpis.expiringCount} expiring`,
                      goodWhen: "down" as const,
                    },
                  }
                : {})}
              data-testid="hr-kpi-expiring"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="hr-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by name or ID…"
                aria-label="Search staff"
                debounceMs={300}
                data-testid="hr-search"
              />
            }
            controls={
              <>
                <Select
                  value={statusFilter.value ?? "active"}
                  onValueChange={(next) => statusFilter.set(next === "active" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Status"
                    data-testid="hr-filter-status"
                  >
                    <SelectValue placeholder="Active" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={orgUnitFilter.value ?? "__all__"}
                  onValueChange={(next) => orgUnitFilter.set(next === "__all__" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Org Unit"
                    data-testid="hr-filter-orgunit"
                  >
                    <SelectValue placeholder="Any org unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any org unit</SelectItem>
                    {orgUnits.map((ou) => (
                      <SelectItem key={ou.id} value={ou.id}>
                        {ou.name}
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
          data: filteredStaff,
          columns,
          mobileFieldPriority: ["displayName", "role", "employeeId", "contractEnd"],
          getRowId: (row) => row.id,
          onRowClick: (row) => router.push(`/management/hr/${row.id}`),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: "No staff members match your filters",
          description: "Clear filters or try a different search.",
          icon: <UserMinus className="size-8" />,
        }}
        data-testid="hr-staff-table"
      />

      {/* ── New Hire Sheet ────────────────────────────────────────── */}
      <FormSheet
        open={newHireOpen}
        onOpenChange={setNewHireOpen}
        title="New Hire"
        description="Create a staff record. An IAM provisioning request will be created automatically."
        formId="new-hire-form"
        submitLabel="Create Staff Record"
        pending={pending}
        submitDisabled={pending}
        width="lg"
        data-testid="hr-new-hire-sheet"
      >
        <FormProvider {...form}>
          <form
            id="new-hire-form"
            onSubmit={form.handleSubmit(handleCreate)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Personal Information">
              <FormRow>
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Full legal name"
                          data-testid="hr-new-hire-legal-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="personal@email.com"
                          data-testid="hr-new-hire-email"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+60 12-345 6789"
                          data-testid="hr-new-hire-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orgUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Org Unit *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="hr-new-hire-orgunit">
                            <SelectValue placeholder="Select org unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {orgUnits.map((ou) => (
                            <SelectItem key={ou.id} value={ou.id}>
                              {ou.name}
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Home address"
                        rows={2}
                        data-testid="hr-new-hire-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSection title="Contract">
              <FormRow>
                <FormField
                  control={form.control}
                  name="contractStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Start *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="hr-new-hire-contract-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract End</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="hr-new-hire-contract-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
            </FormSection>

            <FormSection title="Next of Kin">
              <FormRow>
                <FormField
                  control={form.control}
                  name="kinName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Next of kin name"
                          data-testid="hr-new-hire-kin-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kinRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Spouse, Parent"
                          data-testid="hr-new-hire-kin-relationship"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormField
                control={form.control}
                name="kinPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+60 12-345 6789"
                        data-testid="hr-new-hire-kin-phone"
                      />
                    </FormControl>
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

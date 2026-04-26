"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users,
  UserX,
  ShoppingCart,
  Clock,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString, useUrlEnum } from "@/components/shared/url-state-helpers";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import type {
  SupplierListData,
  SupplierRow,
} from "@/features/procurement/types";
import { createSupplier } from "@/features/procurement/actions/create-supplier";
import {
  createSupplierSchema,
  type CreateSupplierInput,
} from "@/features/procurement/schemas/supplier";

// ── Props ──────────────────────────────────────────────────────────────

type SuppliersListViewProps = Readonly<{
  data: SupplierListData;
  canWrite: boolean;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * SuppliersListView — /management/procurement/suppliers
 *
 * Spec: frontend_spec.md §3b `/management/procurement/suppliers`
 *   KPI: Active | Inactive | Open POs | Avg actual lead time
 *   Filters: is_active toggle, search (name, contact_email)
 *   Columns: name, contact_email, contact_phone, is_active, material count,
 *            open POs (COUNT), last order date
 *   Row click → /management/procurement/suppliers/[id]
 */
export function SuppliersListView({
  data,
  canWrite,
}: SuppliersListViewProps) {
  const router = useRouter();
  const searchFilter = useUrlString("q");
  const activeFilter = useUrlEnum("active", ["true", "false"] as const);
  const [createOpen, setCreateOpen] = React.useState(false);

  // ── Filter data ──────────────────────────────────────────────────────
  const filteredSuppliers = React.useMemo(() => {
    let result = data.suppliers;

    // is_active toggle
    if (activeFilter.value === "true") {
      result = result.filter((s) => s.isActive);
    } else if (activeFilter.value === "false") {
      result = result.filter((s) => !s.isActive);
    }

    // Search: name, contact_email
    const q = searchFilter.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contactEmail ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [data.suppliers, activeFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value || activeFilter.value);

  // ── Filter-reactive KPIs ────────────────────────────────────────────
  const filteredKpis = React.useMemo(() => {
    const source = filteredSuppliers;
    return {
      activeCount: source.filter((s) => s.isActive).length,
      inactiveCount: source.filter((s) => !s.isActive).length,
      openPoCount: source.reduce((sum, s) => sum + s.openPoCount, 0),
      avgActualLeadTimeDays: data.kpis.avgActualLeadTimeDays,
    };
  }, [filteredSuppliers, data.kpis.avgActualLeadTimeDays]);

  // ── Reset filters helper ────────────────────────────────────────────
  const resetAll = React.useCallback(() => {
    searchFilter.set(null);
    activeFilter.set(null);
  }, [searchFilter, activeFilter]);

  // ── Filter chips ────────────────────────────────────────────────────
  const chipNodes: React.ReactNode[] = [];
  if (activeFilter.value) {
    chipNodes.push(
      <FilterChip
        key="active"
        name="Status"
        label={activeFilter.value === "true" ? "Active" : "Inactive"}
        onRemove={() => activeFilter.set(null)}
        data-testid="procurement-supplier-chip-active"
      />,
    );
  }

  // ── Columns ──────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<SupplierRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "contactEmail",
        accessorKey: "contactEmail",
        header: "Email",
        cell: ({ row }) => row.original.contactEmail ?? "—",
      },
      {
        id: "contactPhone",
        accessorKey: "contactPhone",
        header: "Phone",
        cell: ({ row }) => row.original.contactPhone ?? "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "Active" : "Inactive"}
            variant="dot"
            tone={row.original.isActive ? "success" : "neutral"}
          />
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "materialCount",
        accessorKey: "materialCount",
        header: "Materials",
        cell: ({ row }) => row.original.materialCount.toLocaleString(),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "openPoCount",
        accessorKey: "openPoCount",
        header: "Open POs",
        cell: ({ row }) => row.original.openPoCount.toLocaleString(),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "lastOrderDate",
        accessorKey: "lastOrderDate",
        header: "Last Order",
        cell: ({ row }) =>
          row.original.lastOrderDate
            ? format(parseISO(row.original.lastOrderDate), "dd MMM yyyy")
            : "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="procurement-suppliers-list">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier registry — track contacts, linked materials, and purchase order activity."
        data-testid="procurement-suppliers-header"
        primaryAction={
          canWrite ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="procurement-create-supplier-btn"
            >
              <Plus aria-hidden className="size-4" /> Add Supplier
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<SupplierRow>
        kpis={
          <KpiCardRow data-testid="procurement-supplier-kpis">
            <KpiCard
              label="Active"
              value={filteredKpis.activeCount.toLocaleString()}
              icon={<Users aria-hidden className="size-4" />}
              data-testid="procurement-supplier-kpi-active"
            />
            <KpiCard
              label="Inactive"
              value={filteredKpis.inactiveCount.toLocaleString()}
              icon={<UserX aria-hidden className="size-4" />}
              data-testid="procurement-supplier-kpi-inactive"
            />
            <KpiCard
              label="Open POs"
              value={filteredKpis.openPoCount.toLocaleString()}
              icon={<ShoppingCart aria-hidden className="size-4" />}
              data-testid="procurement-supplier-kpi-open-pos"
            />
            <KpiCard
              label="Avg Lead Time"
              value={
                filteredKpis.avgActualLeadTimeDays != null
                  ? `${filteredKpis.avgActualLeadTimeDays}d`
                  : "—"
              }
              caption="actual (order → first delivery)"
              icon={<Clock aria-hidden className="size-4" />}
              data-testid="procurement-supplier-kpi-lead-time"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="procurement-supplier-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by name or email…"
                aria-label="Search suppliers"
                debounceMs={300}
                data-testid="procurement-supplier-search"
              />
            }
            controls={
              <Select
                value={activeFilter.value ?? "__all__"}
                onValueChange={(next) =>
                  activeFilter.set(next === "__all__" ? null : (next as "true" | "false"))
                }
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Active status"
                  data-testid="procurement-supplier-filter-active"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
            chips={chipNodes.length > 0 ? chipNodes : null}
          />
        }
        table={{
          data: filteredSuppliers,
          columns,
          mobileFieldPriority: ["name", "isActive", "openPoCount", "lastOrderDate"],
          getRowId: (row) => row.id,
          onRowClick: (row) =>
            router.push(`/management/procurement/suppliers/${row.id}` as never),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "first-use" as const,
          title: "No suppliers registered",
          description: canWrite
            ? "Add your first supplier to start tracking procurement data."
            : "No suppliers have been registered yet.",
          icon: <Users className="size-8" />,
          ...(canWrite
            ? {
                action: (
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    data-testid="procurement-supplier-empty-cta"
                  >
                    <Plus aria-hidden className="size-4" /> Add Supplier
                  </Button>
                ),
              }
            : {}),
        }}
        data-testid="procurement-suppliers-table"
      />

      {/* ── Create Supplier FormSheet ────────────────────────────── */}
      <CreateSupplierSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

// ── Create Supplier FormSheet ─────────────────────────────────────────

function CreateSupplierSheet({
  open,
  onOpenChange,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
}>) {
  const [pending, setPending] = React.useState(false);
  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema) as Resolver<CreateSupplierInput>,
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      description: "",
      isActive: true,
    },
  });
  const ctl = form.control;

  const handleSubmit = async (values: CreateSupplierInput) => {
    setPending(true);
    try {
      const result = await createSupplier(values);
      if (result.success) {
        toastSuccess("Supplier created");
        onOpenChange(false);
        form.reset({
          name: "",
          contactEmail: "",
          contactPhone: "",
          address: "",
          description: "",
          isActive: true,
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
      title="Add Supplier"
      description="Register a new supplier for procurement."
      formId="create-supplier-form"
      submitLabel="Create Supplier"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="procurement-create-supplier-sheet"
    >
      <FormProvider {...form}>
        <form
          id="create-supplier-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Supplier Info">
            <FormField
              control={ctl}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Supplier name" data-testid="supplier-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormRow>
              <FormField
                control={ctl}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        placeholder="email@supplier.com"
                        data-testid="supplier-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ctl}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1 234 567 8900"
                        data-testid="supplier-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={ctl}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Street address" data-testid="supplier-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={ctl}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Optional notes about this supplier…"
                      data-testid="supplier-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={ctl}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="supplier-is-active"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
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

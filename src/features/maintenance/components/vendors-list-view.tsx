"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { useRouter } from "@/i18n/navigation";

import { createVendor } from "@/features/maintenance/actions/create-vendor";
import { deleteVendor } from "@/features/maintenance/actions/delete-vendor";
import { updateVendor } from "@/features/maintenance/actions/update-vendor";
import {
  createVendorSchema,
  updateVendorSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
} from "@/features/maintenance/schemas/upsert-vendor";
import type {
  VendorListRow,
  VendorsListData,
} from "@/features/maintenance/types";

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "All vendors" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Inactive only" },
] as const;

type Props = Readonly<{
  data: VendorsListData;
  canCreate: boolean;
  canMutate: boolean;
  canDelete: boolean;
}>;

export function VendorsListView({ data, canCreate, canMutate, canDelete }: Props) {
  const router = useRouter();
  const searchFilter = useUrlString("q");
  const activeFilter = useUrlString("active");

  const filtered = React.useMemo(() => {
    let r = [...data.rows];
    const af = activeFilter.value ?? "all";
    if (af === "active") r = r.filter((v) => v.isActive);
    if (af === "inactive") r = r.filter((v) => !v.isActive);
    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      r = r.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.specialization?.toLowerCase().includes(q) ?? false) ||
          (v.contactEmail?.toLowerCase().includes(q) ?? false) ||
          (v.contactPhone?.toLowerCase().includes(q) ?? false),
      );
    }
    return r;
  }, [data.rows, searchFilter.value, activeFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value || activeFilter.value);

  const chips: React.ReactNode[] = [];
  if (activeFilter.value) {
    const label =
      ACTIVE_FILTER_OPTIONS.find((o) => o.value === activeFilter.value)?.label ??
      activeFilter.value;
    chips.push(
      <FilterChip
        key="active"
        name="Status"
        label={label}
        onRemove={() => activeFilter.set(null)}
        data-testid="maintenance-vendors-chip-active"
      />,
    );
  }

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTargetId, setEditTargetId] = React.useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const editTarget = React.useMemo(
    () => data.rows.find((r) => r.id === editTargetId) ?? null,
    [data.rows, editTargetId],
  );
  const deleteTarget = React.useMemo(
    () => data.rows.find((r) => r.id === deleteTargetId) ?? null,
    [data.rows, deleteTargetId],
  );

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("en-MY", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(iso));
  };

  const columns = React.useMemo<ColumnDef<VendorListRow, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Vendor",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            {row.original.specialization ? (
              <span className="text-foreground-muted text-xs">
                {row.original.specialization}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.contactEmail ?? "—"}</span>
            {row.original.contactPhone ? (
              <span className="text-foreground-muted text-xs">
                {row.original.contactPhone}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "openWo",
        header: "Open WOs",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.openWoCount}</span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "lastWo",
        header: "Last WO",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatDate(row.original.lastWoAt)}
          </span>
        ),
        meta: {
          headerClassName: "whitespace-nowrap",
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge
              status="active"
              tone="success"
              data-testid={`maintenance-vendors-status-${row.original.id}`}
            />
          ) : (
            <StatusBadge
              status="inactive"
              tone="neutral"
              data-testid={`maintenance-vendors-status-${row.original.id}`}
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditTargetId(row.original.id)}
                aria-label="Edit"
                data-testid={`maintenance-vendors-edit-${row.original.id}`}
              >
                <Pencil aria-hidden className="size-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteTargetId(row.original.id)}
                aria-label="Delete"
                data-testid={`maintenance-vendors-delete-${row.original.id}`}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [canMutate, canDelete],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="maintenance-vendors-list">
      <PageHeader
        title="Vendor Registry"
        description="Maintenance vendors authorized to receive RADIUS access during scheduled work orders."
        data-testid="maintenance-vendors-header"
        primaryAction={
          canCreate ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="maintenance-vendors-create-btn"
            >
              <Plus aria-hidden className="size-4" /> Add Vendor
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="maintenance-vendors-kpis">
        <KpiCard
          label="Available"
          value={data.kpis.available}
          caption="active, no open work orders"
          icon={<CheckCircle2 aria-hidden className="size-4" />}
          data-testid="maintenance-vendors-kpi-available"
        />
        <KpiCard
          label="Busy"
          value={data.kpis.busy}
          caption="active, with open WOs"
          icon={<Truck aria-hidden className="size-4" />}
          data-testid="maintenance-vendors-kpi-busy"
        />
        <KpiCard
          label="Inactive"
          value={data.kpis.inactive}
          caption="soft-disabled"
          icon={<XCircle aria-hidden className="size-4" />}
          data-testid="maintenance-vendors-kpi-inactive"
        />
      </KpiCardRow>

      <FilterableDataTable<VendorListRow>
        toolbar={
          <FilterBar
            data-testid="maintenance-vendors-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={() => {
              searchFilter.set(null);
              activeFilter.set(null);
            }}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search name, specialization, contact…"
                aria-label="Search vendors"
                debounceMs={300}
                data-testid="maintenance-vendors-search"
              />
            }
            controls={
              <Select
                value={activeFilter.value ?? "all"}
                onValueChange={(v) => activeFilter.set(v === "all" ? null : v)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  data-testid="maintenance-vendors-active-select"
                >
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_FILTER_OPTIONS.map((o) => (
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
          mobileFieldPriority: ["name", "openWo", "status"],
          getRowId: (row) => row.id,
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          !hasActiveFilters && data.rows.length === 0 && canCreate ? (
            <EmptyStateCta
              variant="first-use"
              title="No vendors registered"
              description="Add your first maintenance vendor to start scheduling on-site work."
              icon={<Building2 className="size-8" />}
              frame="none"
              ctaLabel="Add Vendor"
              onClick={() => setCreateOpen(true)}
              data-testid="maintenance-vendors-empty-first"
            />
          ) : (
            {
              variant: "filtered-out" as const,
              title: hasActiveFilters
                ? "No vendors match your filters"
                : "No vendors registered",
              description: hasActiveFilters
                ? "Try clearing filters or adjusting your search."
                : "Add a vendor to get started.",
              icon: <Building2 className="size-8" />,
            }
          )
        }
        data-testid="maintenance-vendors-table"
      />

      <CreateVendorSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />

      {editTarget ? (
        <EditVendorSheet
          row={editTarget}
          onClose={() => setEditTargetId(null)}
          onUpdated={() => router.refresh()}
        />
      ) : null}

      <DeleteVendorDialog
        target={deleteTarget}
        onClose={() => setDeleteTargetId(null)}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}

// ── Forms ───────────────────────────────────────────────────────────────

function buildDefaults(row: VendorListRow | null): CreateVendorInput {
  if (!row) {
    return {
      name: "",
      contactEmail: null,
      contactPhone: null,
      specialization: null,
      description: null,
      isActive: true,
    };
  }
  return {
    name: row.name,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    specialization: row.specialization,
    description: row.description,
    isActive: row.isActive,
  };
}

function CreateVendorSheet({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}>) {
  const form = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema) as Resolver<CreateVendorInput>,
    defaultValues: buildDefaults(null),
  });

  React.useEffect(() => {
    if (open) form.reset(buildDefaults(null));
  }, [open, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: CreateVendorInput): Promise<void> => {
    setPending(true);
    try {
      const result = await createVendor(values);
      if (result.success) {
        toastSuccess("Vendor added.");
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
      title="Add Vendor"
      description="Register a new maintenance vendor. Only active vendors appear in the work-order picker."
      formId="maintenance-vendors-create-form"
      submitLabel="Add"
      pending={pending}
      submitDisabled={pending}
      data-testid="maintenance-vendors-create-sheet"
    >
      <FormProvider {...form}>
        <form
          id="maintenance-vendors-create-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          <VendorFormBody form={form} />
        </form>
      </FormProvider>
    </FormSheet>
  );
}

function EditVendorSheet({
  row,
  onClose,
  onUpdated,
}: Readonly<{
  row: VendorListRow;
  onClose: () => void;
  onUpdated: () => void;
}>) {
  const form = useForm<UpdateVendorInput>({
    resolver: zodResolver(updateVendorSchema) as Resolver<UpdateVendorInput>,
    defaultValues: { id: row.id, ...buildDefaults(row) },
  });

  React.useEffect(() => {
    form.reset({ id: row.id, ...buildDefaults(row) });
  }, [row, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: UpdateVendorInput): Promise<void> => {
    setPending(true);
    try {
      const result = await updateVendor(values);
      if (result.success) {
        toastSuccess("Vendor updated.");
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
      title="Edit Vendor"
      description="Update contact details or soft-disable to remove from the work-order picker without losing history."
      formId="maintenance-vendors-edit-form"
      submitLabel="Save changes"
      pending={pending}
      submitDisabled={pending}
      data-testid="maintenance-vendors-edit-sheet"
    >
      <FormProvider {...form}>
        <form
          id="maintenance-vendors-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          <VendorFormBody
            form={form as unknown as ReturnType<typeof useForm<CreateVendorInput>>}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}

function VendorFormBody({
  form,
}: Readonly<{
  form: ReturnType<typeof useForm<CreateVendorInput>>;
}>) {
  return (
    <>
      <FormSection title="Identity">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="Acme Networks Sdn Bhd"
                  data-testid="maintenance-vendors-form-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization</FormLabel>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : e.target.value)
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="e.g. Network switches, HVAC, biometrics"
                  data-testid="maintenance-vendors-form-specialization"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Contact">
        <FormRow>
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? null : e.target.value)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="ops@vendor.com"
                    data-testid="maintenance-vendors-form-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? null : e.target.value)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="+60 12-345 6789"
                    data-testid="maintenance-vendors-form-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormRow>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : e.target.value)
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="Notes about scope, contract terms, escalation contacts…"
                  data-testid="maintenance-vendors-form-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Status">
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <FormLabel>Active</FormLabel>
                <p className="text-foreground-muted text-xs">
                  Inactive vendors are hidden from the work-order picker.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="maintenance-vendors-form-active"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </>
  );
}

// ── Delete confirmation ──────────────────────────────────────────────────

function DeleteVendorDialog({
  target,
  onClose,
  onDeleted,
}: Readonly<{
  target: VendorListRow | null;
  onClose: () => void;
  onDeleted: () => void;
}>) {
  const [pending, setPending] = React.useState(false);

  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      intent="destructive"
      title={`Delete ${target?.name ?? "vendor"}?`}
      description={
        target && target.openWoCount > 0
          ? "This vendor has open work orders — Postgres will reject the delete. Soft-disable instead by editing and toggling Active off."
          : "Removes the vendor from the registry. Past work orders keep their reference; deleted vendors no longer appear in the picker."
      }
      confirmLabel={pending ? "Deleting…" : "Delete vendor"}
      pending={pending}
      onConfirm={async () => {
        if (!target) return;
        setPending(true);
        try {
          const result = await deleteVendor({ id: target.id });
          if (result.success) {
            toastSuccess("Vendor deleted.");
            onClose();
            onDeleted();
          } else {
            toastError(result);
          }
        } finally {
          setPending(false);
        }
      }}
      data-testid="maintenance-vendors-delete-dialog"
    />
  );
}

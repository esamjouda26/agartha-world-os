"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Ruler, Globe2, Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormRow } from "@/components/ui/form-row";
import { FormSection } from "@/components/ui/form-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { UomConversionListRow, UomConversionsPageData } from "@/features/procurement/types";
import {
  upsertUomConversionSchema,
  type UpsertUomConversionInput,
} from "@/features/procurement/schemas/material";
import { upsertUomConversion } from "@/features/procurement/actions/upsert-uom-conversion";
import { deleteUomConversion } from "@/features/procurement/actions/delete-uom-conversion";

const QTY = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 6,
});

type Props = Readonly<{
  data: UomConversionsPageData;
  /** When false, all CRUD controls disabled. */
  canWrite: boolean;
  /** When false, the delete control is hidden. */
  canDelete: boolean;
}>;

export function UomConversionsPage({ data, canWrite, canDelete }: Props) {
  const scopeFilter = useUrlString("scope"); // "global" | "material" | null=all
  const materialFilter = useUrlString("material");
  const searchFilter = useUrlString("q");

  const filtered = React.useMemo(() => {
    let rows = [...data.conversions];
    if (scopeFilter.value === "global") {
      rows = rows.filter((r) => r.isGlobal);
    } else if (scopeFilter.value === "material") {
      rows = rows.filter((r) => !r.isGlobal);
    }
    if (materialFilter.value) {
      rows = rows.filter((r) => r.materialId === materialFilter.value);
    }
    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.materialName?.toLowerCase().includes(q) ?? false) ||
          r.fromUnitAbbreviation.toLowerCase().includes(q) ||
          r.toUnitAbbreviation.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [data.conversions, scopeFilter.value, materialFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(scopeFilter.value || materialFilter.value || searchFilter.value);
  const resetAll = (): void => {
    scopeFilter.set(null);
    materialFilter.set(null);
    searchFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (scopeFilter.value) {
    chips.push(
      <FilterChip
        key="scope"
        name="Scope"
        label={scopeFilter.value === "global" ? "Global" : "Material-specific"}
        onRemove={() => scopeFilter.set(null)}
        data-testid="uom-filter-chip-scope"
      />,
    );
  }
  if (materialFilter.value) {
    const m = data.materials.find((x) => x.id === materialFilter.value);
    chips.push(
      <FilterChip
        key="material"
        name="Material"
        label={m?.name ?? materialFilter.value}
        onRemove={() => materialFilter.set(null)}
        data-testid="uom-filter-chip-material"
      />,
    );
  }

  // ── KPIs ─────────────────────────────────────────────────────────────
  const totalCount = data.conversions.length;
  const globalCount = data.conversions.filter((c) => c.isGlobal).length;
  const materialSpecific = totalCount - globalCount;
  const materialsWithUom = new Set(
    data.conversions.filter((c) => !c.isGlobal).map((c) => c.materialId),
  ).size;

  // ── Edit/Create state ────────────────────────────────────────────────
  const [editing, setEditing] = React.useState<UomConversionListRow | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<UomConversionListRow | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      const result = await deleteUomConversion({ id: deleting.id });
      if (result.success) {
        toastSuccess("Conversion deleted");
        setDeleting(null);
      } else {
        toastError(result);
      }
    } finally {
      setDeletePending(false);
    }
  };

  const columns = React.useMemo<ColumnDef<UomConversionListRow, unknown>[]>(
    () => [
      {
        id: "scope",
        header: "Scope",
        cell: ({ row }) =>
          row.original.isGlobal ? (
            <span className="text-foreground-muted inline-flex items-center gap-1.5 text-sm">
              <Globe2 aria-hidden className="size-3.5" />
              Global
            </span>
          ) : (
            <span className="text-foreground font-medium">{row.original.materialName ?? "—"}</span>
          ),
      },
      {
        id: "from",
        header: "From",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.fromUnitName} ({row.original.fromUnitAbbreviation})
          </span>
        ),
      },
      {
        id: "to",
        header: "To",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.toUnitName} ({row.original.toUnitAbbreviation})
          </span>
        ),
      },
      {
        id: "factor",
        header: "Factor",
        cell: ({ row }) => <span className="tabular-nums">{QTY.format(row.original.factor)}</span>,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "globalBadge",
        header: "",
        cell: ({ row }) =>
          row.original.isGlobal ? (
            <StatusBadge
              status="info"
              variant="dot"
              tone="info"
              label="Applies to all materials"
              data-testid={`uom-row-global-${row.original.id}`}
            />
          ) : null,
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {canWrite ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(row.original)}
                data-testid={`uom-row-edit-${row.original.id}`}
                aria-label="Edit"
              >
                <Pencil aria-hidden className="size-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleting(row.original)}
                data-testid={`uom-row-delete-${row.original.id}`}
                aria-label="Delete"
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
    [canWrite, canDelete],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="uom-conversions-page">
      <PageHeader
        title="UOM Conversions"
        description="Unit-of-measure conversions used by procurement, inventory, and POS catalogs."
        data-testid="uom-conversions-header"
        primaryAction={
          canWrite ? (
            <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="uom-create-btn">
              <Plus aria-hidden className="size-4" />
              New Conversion
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<UomConversionListRow>
        kpis={
          <KpiCardRow data-testid="uom-kpis">
            <KpiCard
              label="Total conversions"
              value={totalCount}
              icon={<Ruler aria-hidden className="size-4" />}
              data-testid="uom-kpi-total"
            />
            <KpiCard
              label="Global"
              value={globalCount}
              caption="apply to every material"
              icon={<Globe2 aria-hidden className="size-4" />}
              data-testid="uom-kpi-global"
            />
            <KpiCard
              label="Material-specific"
              value={materialSpecific}
              caption="conversion rows"
              data-testid="uom-kpi-material-specific"
            />
            <KpiCard
              label="Materials with custom UOM"
              value={materialsWithUom}
              data-testid="uom-kpi-materials-covered"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="uom-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by material or unit…"
                aria-label="Search UOM conversions"
                debounceMs={300}
                data-testid="uom-search"
              />
            }
            controls={
              <>
                <Select
                  value={scopeFilter.value ?? "__all__"}
                  onValueChange={(next) => scopeFilter.set(next === "__all__" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Scope"
                    data-testid="uom-filter-scope"
                  >
                    <SelectValue placeholder="Any scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any scope</SelectItem>
                    <SelectItem value="global">Global only</SelectItem>
                    <SelectItem value="material">Material-specific</SelectItem>
                  </SelectContent>
                </Select>
                <SearchableSelect
                  value={materialFilter.value}
                  onChange={(v) => materialFilter.set(v)}
                  options={data.materials.map((m) => ({
                    value: m.id,
                    label: m.sku ? `${m.name} (${m.sku})` : m.name,
                  }))}
                  placeholder="Any material"
                  searchPlaceholder="Search materials…"
                  className="h-10 min-w-[14rem] sm:w-auto"
                  data-testid="uom-filter-material"
                />
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filtered,
          columns,
          mobileFieldPriority: ["scope", "from", "to", "factor"],
          getRowId: (row) => row.id,
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: hasActiveFilters ? "No conversions match your filters" : "No UOM conversions yet",
          description: hasActiveFilters
            ? "Clear filters or try a different search."
            : "Conversions translate purchase units into base units for stock movement and POS pricing.",
          icon: <Ruler className="size-8" />,
        }}
        data-testid="uom-table"
      />

      {/* ── Create/Edit Form Sheet ─────────────────────────────────── */}
      <UomFormSheet
        open={createOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        editing={editing}
        materials={data.materials}
        units={data.units}
      />

      {/* ── Delete confirm ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        intent="destructive"
        title="Delete UOM conversion?"
        description={
          deleting
            ? `Remove the ${deleting.fromUnitAbbreviation} → ${deleting.toUnitAbbreviation} conversion${deleting.materialName ? ` for ${deleting.materialName}` : " (global)"}.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        pending={deletePending}
        data-testid="uom-delete-confirm"
      />
    </div>
  );
}

// ── Form sheet ────────────────────────────────────────────────────────

function UomFormSheet({
  open,
  onOpenChange,
  editing,
  materials,
  units,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: UomConversionListRow | null;
  materials: UomConversionsPageData["materials"];
  units: UomConversionsPageData["units"];
}>) {
  const form = useForm<UpsertUomConversionInput>({
    resolver: zodResolver(upsertUomConversionSchema) as Resolver<UpsertUomConversionInput>,
    defaultValues: editing
      ? {
          id: editing.id,
          materialId: editing.materialId ?? undefined,
          fromUnitId: editing.fromUnitId,
          toUnitId: editing.toUnitId,
          factor: editing.factor,
        }
      : {
          fromUnitId: "",
          toUnitId: "",
          factor: 1,
        },
  });

  // Reset on open/close to honor the editing snapshot.
  React.useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              id: editing.id,
              materialId: editing.materialId ?? undefined,
              fromUnitId: editing.fromUnitId,
              toUnitId: editing.toUnitId,
              factor: editing.factor,
            }
          : {
              fromUnitId: "",
              toUnitId: "",
              factor: 1,
            },
      );
    }
  }, [open, editing, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: UpsertUomConversionInput): Promise<void> => {
    setPending(true);
    try {
      const result = await upsertUomConversion(values);
      if (result.success) {
        toastSuccess(editing ? "Conversion updated" : "Conversion created");
        onOpenChange(false);
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as keyof UpsertUomConversionInput, {
              type: "server",
              message,
            });
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
      title={editing ? "Edit Conversion" : "New Conversion"}
      description={
        editing
          ? "Update the conversion factor or change scope."
          : "Translate one unit into another for procurement, inventory, and POS."
      }
      formId="uom-form"
      submitLabel={editing ? "Save changes" : "Create"}
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="uom-form-sheet"
    >
      <FormProvider {...form}>
        <form
          id="uom-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Scope">
            <FormField
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material (leave blank for global)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value ?? null}
                      onChange={(v) => field.onChange(v ?? undefined)}
                      options={materials.map((m) => ({
                        value: m.id,
                        label: m.sku ? `${m.name} (${m.sku})` : m.name,
                      }))}
                      placeholder="Global conversion"
                      searchPlaceholder="Search materials…"
                      data-testid="uom-form-material"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Conversion">
            <FormRow>
              <FormField
                control={form.control}
                name="fromUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From unit *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="uom-form-from-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.abbreviation})
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
                name="toUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To unit *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="uom-form-to-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.abbreviation})
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
              name="factor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factor *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      placeholder="e.g. 12 (1 case = 12 bottles)"
                      data-testid="uom-form-factor"
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
  );
}

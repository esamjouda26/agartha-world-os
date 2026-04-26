"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider, type Control, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  Clock,
  PackageMinus,
} from "lucide-react";
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
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import type { MaterialListData, MaterialRow } from "@/features/procurement/types";
import { createMaterial } from "@/features/procurement/actions/create-material";
import {
  createMaterialSchema,
  MATERIAL_TYPES,
  VALUATION_METHODS,
  type CreateMaterialInput,
} from "@/features/procurement/schemas/material";

// ── Constants ──────────────────────────────────────────────────────────

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  raw: "Raw",
  semi_finished: "Semi-Finished",
  finished: "Finished",
  trading: "Trading",
  consumable: "Consumable",
  service: "Service",
};

const VALUATION_METHOD_LABELS: Record<string, string> = {
  standard: "Standard",
  moving_avg: "Moving Average",
  fifo: "FIFO",
};

// ── Props ──────────────────────────────────────────────────────────────

type MaterialsListViewProps = Readonly<{
  data: MaterialListData;
  canWrite: boolean;
  units: ReadonlyArray<{ id: string; name: string; abbreviation: string }>;
  locale: string;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function MaterialsListView({
  data,
  canWrite,
  units,
  locale: _locale,
}: MaterialsListViewProps) {
  const router = useRouter();
  const typeFilter = useUrlString("type");
  const categoryFilter = useUrlString("category");
  const searchFilter = useUrlString("q");

  const [createOpen, setCreateOpen] = React.useState(false);

  // ── Filter data ────────────────────────────────────────────────────
  const filteredMaterials = React.useMemo(() => {
    let result = [...data.materials];

    // Material type filter
    if (typeFilter.value) {
      result = result.filter((m) => m.materialType === typeFilter.value);
    }

    // Category filter
    if (categoryFilter.value) {
      result = result.filter((m) => m.categoryId === categoryFilter.value);
    }

    // Search filter
    const q = searchFilter.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.sku?.toLowerCase().includes(q) ?? false),
      );
    }

    // Sort by name ASC
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [data.materials, typeFilter.value, categoryFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(
    typeFilter.value || categoryFilter.value || searchFilter.value,
  );

  // ── Filter-reactive KPIs ───────────────────────────────────────────
  const filteredKpis = React.useMemo(() => {
    const source = hasActiveFilters ? filteredMaterials : data.materials;
    let needsOrderingCount = 0;
    let noSupplierCount = 0;
    let onOrderCount = 0;
    let leadTimeSum = 0;
    let leadTimeCount = 0;

    for (const m of source) {
      if (m.needsReorder) needsOrderingCount++;
      if (!m.defaultSupplierName) noSupplierCount++;
      if (m.hasOpenPo) onOrderCount++;
      if (m.defaultSupplierLeadTimeDays != null && m.defaultSupplierLeadTimeDays > 0) {
        leadTimeSum += m.defaultSupplierLeadTimeDays;
        leadTimeCount++;
      }
    }

    return {
      needsOrderingCount,
      noSupplierCount,
      onOrderCount,
      avgLeadTimeDays:
        leadTimeCount > 0 ? Math.round(leadTimeSum / leadTimeCount) : null,
    };
  }, [filteredMaterials, data.materials, hasActiveFilters]);

  const resetAll = (): void => {
    typeFilter.set(null);
    categoryFilter.set(null);
    searchFilter.set(null);
  };

  // ── Filter chips ──────────────────────────────────────────────────
  const chips: React.ReactNode[] = [];
  if (typeFilter.value) {
    chips.push(
      <FilterChip
        key="type"
        name="Type"
        label={MATERIAL_TYPE_LABELS[typeFilter.value] ?? typeFilter.value}
        onRemove={() => typeFilter.set(null)}
        data-testid="procurement-filter-chip-type"
      />,
    );
  }
  if (categoryFilter.value) {
    const catName = data.categories.find(
      (c) => c.id === categoryFilter.value,
    )?.name;
    chips.push(
      <FilterChip
        key="category"
        name="Category"
        label={catName ?? categoryFilter.value}
        onRemove={() => categoryFilter.set(null)}
        data-testid="procurement-filter-chip-category"
      />,
    );
  }

  // ── Columns ────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<MaterialRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "sku",
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-sm">
            {row.original.sku ?? "—"}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "materialType",
        accessorKey: "materialType",
        header: "Type",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.materialType}
            label={MATERIAL_TYPE_LABELS[row.original.materialType] ?? row.original.materialType}
            variant="outline"
            tone="neutral"
            data-testid="procurement-material-type-badge"
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "category",
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => row.original.categoryName ?? "—",
      },
      {
        id: "baseUnit",
        accessorKey: "baseUnitAbbreviation",
        header: "Unit",
        cell: ({ row }) => row.original.baseUnitAbbreviation ?? "—",
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "defaultSupplier",
        accessorKey: "defaultSupplierName",
        header: "Default Supplier",
        cell: ({ row }) => row.original.defaultSupplierName ?? "—",
      },
      {
        id: "onHand",
        accessorKey: "onHand",
        header: "On Hand",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <span
              className={
                m.needsReorder
                  ? "text-status-danger-foreground font-semibold"
                  : "text-foreground tabular-nums"
              }
            >
              {m.onHand.toLocaleString()}
              {m.needsReorder && (
                <AlertTriangle
                  aria-label="Below reorder point"
                  className="ml-1 inline-block size-3.5"
                />
              )}
            </span>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "active" : "obsolete"}
            variant="dot"
            data-testid="procurement-material-active-badge"
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

  // ── Create Material Form ──────────────────────────────────────────
  const form = useForm<CreateMaterialInput>({
    resolver: zodResolver(createMaterialSchema) as Resolver<CreateMaterialInput>,
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      materialType: "raw",
      categoryId: "",
      baseUnitId: "",
      reorderPoint: 0,
      safetyStock: 0,
      standardCost: undefined,
      valuationMethod: "moving_avg",
      shelfLifeDays: undefined,
      storageConditions: "",
      weightKg: undefined,
      isReturnable: false,
      isActive: true,
    },
  });

  // RHF v7.54+ added a third type-param to `Control` that doesn't infer
  // through `FormProvider`. Explicit alias avoids 16 × TS2322 on each
  // `<FormField control={…}>` usage below.
  const ctl = form.control as unknown as Control<CreateMaterialInput>;

  const [pending, setPending] = React.useState(false);

  const handleCreate = async (values: CreateMaterialInput): Promise<void> => {
    setPending(true);
    try {
      const result = await createMaterial(values);
      if (result.success) {
        toastSuccess("Material created", {
          description: `${values.name} has been added to the material registry.`,
        });
        setCreateOpen(false);
        form.reset();
      } else {
        toastError(result);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="procurement-materials-list">
      <PageHeader
        title="Materials"
        description="Master material registry for procurement — manage all materials with supplier and unit data."
        data-testid="procurement-materials-header"
        primaryAction={
          canWrite ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="procurement-create-material-btn"
            >
              <Package aria-hidden className="size-4" />
              New Material
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<MaterialRow>
        kpis={
          <KpiCardRow data-testid="procurement-kpis">
            <KpiCard
              label="Needs Ordering"
              value={filteredKpis.needsOrderingCount}
              caption="below reorder point"
              icon={<AlertTriangle aria-hidden className="size-4" />}
              {...(filteredKpis.needsOrderingCount > 0
                ? {
                    trend: {
                      direction: "up" as const,
                      label: `${filteredKpis.needsOrderingCount} items`,
                      goodWhen: "down" as const,
                    },
                  }
                : {})}
              data-testid="procurement-kpi-needs-ordering"
            />
            <KpiCard
              label="No Supplier"
              value={filteredKpis.noSupplierCount}
              caption="unassigned"
              icon={<PackageMinus aria-hidden className="size-4" />}
              data-testid="procurement-kpi-no-supplier"
            />
            <KpiCard
              label="On Order"
              value={filteredKpis.onOrderCount}
              caption="open PO lines"
              icon={<ShoppingCart aria-hidden className="size-4" />}
              data-testid="procurement-kpi-on-order"
            />
            <KpiCard
              label="Avg Lead Time"
              value={
                filteredKpis.avgLeadTimeDays != null
                  ? `${filteredKpis.avgLeadTimeDays}d`
                  : "—"
              }
              caption="from default supplier"
              icon={<Clock aria-hidden className="size-4" />}
              data-testid="procurement-kpi-avg-lead-time"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="procurement-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search by name or SKU…"
                aria-label="Search materials"
                debounceMs={300}
                data-testid="procurement-search"
              />
            }
            controls={
              <>
                <Select
                  value={typeFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    typeFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Material Type"
                    data-testid="procurement-filter-type"
                  >
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any type</SelectItem>
                    {MATERIAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {MATERIAL_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    categoryFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Category"
                    data-testid="procurement-filter-category"
                  >
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any category</SelectItem>
                    {data.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
          data: filteredMaterials,
          columns,
          mobileFieldPriority: ["name", "sku", "onHand", "defaultSupplier", "materialType"],
          getRowId: (row) => row.id,
          onRowClick: (row) =>
            router.push(`/management/procurement/${row.id}`),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: "No materials match your filters",
          description: "Clear filters or try a different search.",
          icon: <PackageMinus className="size-8" />,
        }}
        data-testid="procurement-materials-table"
      />

      {/* ── Create Material Sheet ──────────────────────────────────── */}
      <FormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Material"
        description="Add a new material to the procurement registry."
        formId="create-material-form"
        submitLabel="Create Material"
        pending={pending}
        submitDisabled={pending}
        width="lg"
        data-testid="procurement-create-material-sheet"
      >
        <FormProvider {...form}>
          <form
            id="create-material-form"
            onSubmit={form.handleSubmit(handleCreate as never)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Identification">
              <FormRow>
                <FormField
                  control={ctl}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Material name"
                          data-testid="procurement-create-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="materialType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="procurement-create-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATERIAL_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {MATERIAL_TYPE_LABELS[t]}
                            </SelectItem>
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
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. RAW-001"
                          data-testid="procurement-create-sku"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. 4901234567890"
                          data-testid="procurement-create-barcode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormRow>
                <FormField
                  control={ctl}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="procurement-create-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="baseUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Unit *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="procurement-create-base-unit">
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
            </FormSection>

            <FormSection title="Inventory">
              <FormRow>
                <FormField
                  control={ctl}
                  name="reorderPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step="any"
                          data-testid="procurement-create-reorder-point"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="safetyStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Safety Stock</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step="any"
                          data-testid="procurement-create-safety-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormRow>
                <FormField
                  control={ctl}
                  name="standardCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Cost</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step="0.01"
                          value={field.value ?? ""}
                          data-testid="procurement-create-standard-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="valuationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valuation Method</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="procurement-create-valuation">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VALUATION_METHODS.map((v) => (
                            <SelectItem key={v} value={v}>
                              {VALUATION_METHOD_LABELS[v]}
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

            <FormSection title="Additional">
              <FormRow>
                <FormField
                  control={ctl}
                  name="shelfLifeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shelf Life (days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={1}
                          value={field.value ?? ""}
                          data-testid="procurement-create-shelf-life"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step="0.01"
                          value={field.value ?? ""}
                          data-testid="procurement-create-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormField
                control={ctl}
                name="storageConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Conditions</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Refrigerated 2-8°C"
                        data-testid="procurement-create-storage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormRow>
                <FormField
                  control={ctl}
                  name="isReturnable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="procurement-create-returnable"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Returnable</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={ctl}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="procurement-create-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </FormRow>
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { StatusBadge } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { SectionCard } from "@/components/ui/section-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  PosPointDetailData,
  CatalogRow,
  DisplayCategoryRow,
  BomPreviewRow,
} from "@/features/pos/types/management";
import { upsertCatalogItem } from "@/features/pos/actions/upsert-catalog-item";
import { upsertDisplayCategory } from "@/features/pos/actions/upsert-display-category";
import { formatCents } from "@/lib/money";
import {
  upsertCatalogItemSchema,
  type UpsertCatalogItemInput,
} from "@/features/pos/schemas/catalog-item";
import {
  upsertDisplayCategorySchema,
  type UpsertDisplayCategoryInput,
} from "@/features/pos/schemas/display-category";
import type { FieldPath } from "react-hook-form";

// ── Constants ───────────────────────────────────────────────────────────

const TAB_PARAM = "tab";
const CATALOG_SEARCH_PARAM = "cq";
const CATALOG_CAT_PARAM = "ccat";
const CAT_SEARCH_PARAM = "catq";
const MOBILE_CATALOG_COLS = ["displayName", "sellingPrice", "isActive"] as const;
const MOBILE_CATEGORY_COLS = ["name", "sortOrder"] as const;
const MOBILE_BOM_COLS = ["componentMaterialName", "quantity"] as const;

type DetailTab = "menu" | "categories" | "recipes";
const TAB_VALUES: readonly DetailTab[] = ["menu", "categories", "recipes"];

// ── Props ────────────────────────────────────────────────────────────────

type PosPointDetailViewProps = Readonly<{
  data: PosPointDetailData;
  canWrite: boolean;
}>;

// ── Catalog Item Form ─────────────────────────────────────────────────────

type CatalogFormProps = Readonly<{
  defaultValues: UpsertCatalogItemInput;
  materials: ReadonlyArray<{ id: string; name: string }>;
  displayCategories: ReadonlyArray<{ id: string; name: string }>;
  onSuccess: () => void;
}>;

function CatalogItemForm({
  defaultValues,
  materials,
  displayCategories,
  onSuccess,
}: CatalogFormProps) {
  const form = useForm<UpsertCatalogItemInput>({
    resolver: zodResolver(upsertCatalogItemSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertCatalogItemInput) {
    const res = await upsertCatalogItem(values);
    if (res.success) {
      toastSuccess(values.isUpdate ? "Catalog item updated." : "Catalog item added.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertCatalogItemInput>, { type: "server", message });
      }
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
        data-testid="catalog-item-form"
      >
        {!defaultValues.isUpdate && (
          <FormField
            control={form.control}
            name="materialId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material</FormLabel>
                <SearchableSelect
                  options={materials.map((m) => ({ value: m.id, label: m.name }))}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  placeholder="Search materials…"
                  data-testid="catalog-item-form-material"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Override material name on menu…"
                  data-testid="catalog-item-form-display-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sellingPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Selling price (MYR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="catalog-item-form-price"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display category (optional)</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <FormControl>
                  <SelectTrigger data-testid="catalog-item-form-category">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {displayCategories.map((c) => (
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
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  type="url"
                  placeholder="https://…"
                  data-testid="catalog-item-form-image-url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allergens"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergens (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={2}
                  placeholder="e.g. dairy, gluten, nuts"
                  data-testid="catalog-item-form-allergens"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  data-testid="catalog-item-form-sort-order"
                />
              </FormControl>
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
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="catalog-item-is-active"
                    data-testid="catalog-item-form-is-active"
                  />
                </FormControl>
                <Label htmlFor="catalog-item-is-active">Visible on menu</Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton data-testid="catalog-item-form-submit">
          {defaultValues.isUpdate ? "Update item" : "Add to menu"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Display Category Form ─────────────────────────────────────────────────

type CategoryFormProps = Readonly<{
  defaultValues: UpsertDisplayCategoryInput;
  onSuccess: () => void;
}>;

function DisplayCategoryForm({ defaultValues, onSuccess }: CategoryFormProps) {
  const form = useForm<UpsertDisplayCategoryInput>({
    resolver: zodResolver(upsertDisplayCategorySchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertDisplayCategoryInput) {
    const res = await upsertDisplayCategory(values);
    if (res.success) {
      toastSuccess(values.id ? "Category updated." : "Category created.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertDisplayCategoryInput>, { type: "server", message });
      }
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
        data-testid="display-category-form"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Hot Drinks"
                  data-testid="display-category-form-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  data-testid="display-category-form-sort-order"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton data-testid="display-category-form-submit">
          {defaultValues.id ? "Update category" : "Create category"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Menu Tab ──────────────────────────────────────────────────────────────

type MenuTabProps = Readonly<{
  posPointId: string;
  catalog: ReadonlyArray<CatalogRow>;
  displayCategories: ReadonlyArray<DisplayCategoryRow>;
  materials: ReadonlyArray<{ id: string; name: string; materialType: string }>;
  canWrite: boolean;
  onMutationSuccess: () => void;
}>;

function MenuTab({
  posPointId,
  catalog,
  displayCategories,
  materials,
  canWrite,
  onMutationSuccess,
}: MenuTabProps) {
  const search = useUrlString(CATALOG_SEARCH_PARAM);
  const categoryFilter = useUrlString(CATALOG_CAT_PARAM);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<CatalogRow | null>(null);

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }
  function openEdit(row: CatalogRow) {
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
    onMutationSuccess();
  }

  const filtered = React.useMemo(() => {
    let result = [...catalog];
    if (categoryFilter.value) {
      result = result.filter((r) => r.displayCategoryId === categoryFilter.value);
    }
    const q = search.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          (r.displayName ?? r.materialName).toLowerCase().includes(q) ||
          (r.displayCategoryName ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [catalog, search.value, categoryFilter.value]);

  const hasActiveFilters = Boolean(search.value || categoryFilter.value);
  const resetAll = () => {
    search.set(null);
    categoryFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (categoryFilter.value) {
    const catName = displayCategories.find((c) => c.id === categoryFilter.value)?.name;
    chips.push(
      <FilterChip
        key="category"
        name="Category"
        label={catName ?? categoryFilter.value}
        onRemove={() => categoryFilter.set(null)}
        data-testid="catalog-chip-category"
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        id: "displayName",
        header: "Item name",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.displayName ?? row.original.materialName}
          </span>
        ),
      },
      {
        id: "sellingPrice",
        header: "Price",
        cell: ({ row }) => formatCents(row.original.sellingPrice),
      },
      {
        id: "displayCategoryName",
        header: "Category",
        cell: ({ row }) => row.original.displayCategoryName ?? "—",
      },
      {
        id: "soldLast7d",
        header: "Sold (7d)",
        cell: ({ row }) => row.original.soldLast7d,
      },
      {
        id: "revenueLast7d",
        header: "Revenue (7d)",
        cell: ({ row }) => formatCents(row.original.revenueLast7d),
      },
      {
        id: "isActive",
        header: "Visible",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "active" : "offline"}
            label={row.original.isActive ? "Visible" : "Hidden"}
            data-testid={`catalog-status-${row.original.materialId}`}
          />
        ),
      },
      ...(canWrite
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: CatalogRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(row.original);
                  }}
                  aria-label={`Edit ${row.original.displayName ?? row.original.materialName}`}
                  data-testid={`catalog-edit-${row.original.materialId}`}
                >
                  <Edit className="size-4" aria-hidden />
                </Button>
              ),
            },
          ] satisfies ColumnDef<CatalogRow>[])
        : []),
    ],
    [canWrite],
  );

  const catalogMaterialIds = new Set(catalog.map((r) => r.materialId));
  const availableMaterials = materials.filter((m) => !catalogMaterialIds.has(m.id));

  const defaultFormValues: UpsertCatalogItemInput = editTarget
    ? {
        materialId: editTarget.materialId,
        posPointId,
        displayName: editTarget.displayName ?? undefined,
        sellingPrice: editTarget.sellingPrice / 100,
        displayCategoryId: editTarget.displayCategoryId ?? undefined,
        imageUrl: editTarget.imageUrl ?? undefined,
        allergens: editTarget.allergens ?? undefined,
        sortOrder: editTarget.sortOrder,
        isActive: editTarget.isActive,
        isUpdate: true,
      }
    : {
        materialId: "",
        posPointId,
        sellingPrice: 0,
        sortOrder: catalog.length,
        isActive: true,
        isUpdate: false,
      };

  return (
    <div className="flex flex-col gap-4" data-testid="catalog-tab-panel">
      <FilterableDataTable
        toolbar={
          <FilterBar
            data-testid="catalog-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={CATALOG_SEARCH_PARAM}
                placeholder="Search items…"
                data-testid="catalog-search"
              />
            }
            controls={
              <Select
                value={categoryFilter.value ?? "all"}
                onValueChange={(next) => categoryFilter.set(next === "all" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem]"
                  aria-label="Display category"
                  data-testid="catalog-filter-category"
                >
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {displayCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            moreAction={
              canWrite ? (
                <Button size="sm" onClick={openCreate} data-testid="catalog-add-btn">
                  <Plus aria-hidden className="size-4" />
                  Add item
                </Button>
              ) : null
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filtered,
          columns,
          mobileFieldPriority: MOBILE_CATALOG_COLS,
          getRowId: (row) => row.materialId,
          "data-testid": "catalog-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No items match your filters.", variant: "filtered-out" }
            : { title: "No items on this menu yet.", variant: "first-use" }
        }
        data-testid="catalog-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit catalog item" : "Add item to menu"}
        hideFooter
        data-testid="catalog-item-sheet"
      >
        <CatalogItemForm
          key={editTarget?.materialId ?? "create"}
          defaultValues={defaultFormValues}
          materials={availableMaterials}
          displayCategories={displayCategories}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </div>
  );
}

// ── Categories Tab ────────────────────────────────────────────────────────

type CategoriesTabProps = Readonly<{
  posPointId: string;
  displayCategories: ReadonlyArray<DisplayCategoryRow>;
  canWrite: boolean;
  onMutationSuccess: () => void;
}>;

function CategoriesTab({
  posPointId,
  displayCategories,
  canWrite,
  onMutationSuccess,
}: CategoriesTabProps) {
  const search = useUrlString(CAT_SEARCH_PARAM);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<DisplayCategoryRow | null>(null);

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }
  function openEdit(row: DisplayCategoryRow) {
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
    onMutationSuccess();
  }

  const filtered = React.useMemo(() => {
    if (!search.value) return displayCategories;
    const lower = search.value.toLowerCase();
    return displayCategories.filter((r) => r.name.toLowerCase().includes(lower));
  }, [displayCategories, search.value]);

  const hasActiveFilters = Boolean(search.value);

  const columns = React.useMemo<ColumnDef<DisplayCategoryRow>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "sortOrder", accessorKey: "sortOrder", header: "Sort order" },
      ...(canWrite
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: DisplayCategoryRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(row.original);
                  }}
                  aria-label={`Edit ${row.original.name}`}
                  data-testid={`category-edit-${row.original.id}`}
                >
                  <Edit className="size-4" aria-hidden />
                </Button>
              ),
            },
          ] satisfies ColumnDef<DisplayCategoryRow>[])
        : []),
    ],
    [canWrite],
  );

  const defaultFormValues: UpsertDisplayCategoryInput = editTarget
    ? { id: editTarget.id, posPointId, name: editTarget.name, sortOrder: editTarget.sortOrder }
    : { posPointId, name: "", sortOrder: displayCategories.length };

  return (
    <div className="flex flex-col gap-4" data-testid="categories-tab-panel">
      <FilterableDataTable
        toolbar={
          <FilterBar
            data-testid="categories-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={() => search.set(null)}
            search={
              <UrlSearchInput
                param={CAT_SEARCH_PARAM}
                placeholder="Search categories…"
                data-testid="category-search"
              />
            }
            moreAction={
              canWrite ? (
                <Button size="sm" onClick={openCreate} data-testid="category-add-btn">
                  <Plus aria-hidden className="size-4" />
                  Add category
                </Button>
              ) : null
            }
          />
        }
        table={{
          data: filtered,
          columns,
          mobileFieldPriority: MOBILE_CATEGORY_COLS,
          getRowId: (row) => row.id,
          "data-testid": "categories-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No categories match your search.", variant: "filtered-out" }
            : { title: "No display categories yet.", variant: "first-use" }
        }
        data-testid="categories-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit category" : "New display category"}
        hideFooter
        data-testid="display-category-sheet"
      >
        <DisplayCategoryForm
          key={editTarget?.id ?? "create"}
          defaultValues={defaultFormValues}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </div>
  );
}

// ── Recipes Tab ───────────────────────────────────────────────────────────

type RecipesTabProps = Readonly<{
  catalog: ReadonlyArray<CatalogRow>;
  bomPreviews: ReadonlyArray<BomPreviewRow>;
}>;

function RecipesTab({ catalog, bomPreviews }: RecipesTabProps) {
  const bomByMaterial = React.useMemo(() => {
    const map = new Map<string, BomPreviewRow[]>();
    for (const row of bomPreviews) {
      const existing = map.get(row.parentMaterialId) ?? [];
      map.set(row.parentMaterialId, [...existing, row]);
    }
    return map;
  }, [bomPreviews]);

  const bomColumns = React.useMemo<ColumnDef<BomPreviewRow>[]>(
    () => [
      { id: "componentMaterialName", header: "Component", accessorKey: "componentMaterialName" },
      { id: "quantity", header: "Qty", cell: ({ row }) => row.original.quantity },
      { id: "scrapPct", header: "Scrap %", cell: ({ row }) => `${row.original.scrapPct}%` },
      {
        id: "isPhantom",
        header: "Phantom",
        cell: ({ row }) => (row.original.isPhantom ? "Yes" : "No"),
      },
    ],
    [],
  );

  if (catalog.length === 0) {
    return (
      <EmptyStateCta
        variant="first-use"
        title="No catalog items"
        description="Add items to the menu first, then recipes will appear here."
        data-testid="recipes-empty"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="recipes-tab-panel">
      {catalog.map((item) => {
        const components = bomByMaterial.get(item.materialId) ?? [];
        const itemName = item.displayName ?? item.materialName;
        return (
          <SectionCard
            key={item.materialId}
            title={itemName}
            description={
              components.length === 0
                ? "No recipe required"
                : `${components.length} component${components.length === 1 ? "" : "s"}`
            }
            data-testid={`recipe-card-${item.materialId}`}
          >
            {components.length > 0 ? (
              <DataTable
                data={components}
                columns={bomColumns}
                mobileFieldPriority={MOBILE_BOM_COLS}
                getRowId={(row) => row.componentMaterialId}
                toolbar="none"
                frame="none"
                data-testid={`recipe-table-${item.materialId}`}
              />
            ) : (
              <p className="text-foreground-muted text-sm">No BOM required for this item type.</p>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────

export function PosPointDetailView({ data, canWrite }: PosPointDetailViewProps) {
  const router = useRouter();
  const [tab] = useQueryState(
    TAB_PARAM,
    parseAsStringEnum<DetailTab>([...TAB_VALUES]).withDefault("menu"),
  );

  function handleMutationSuccess() {
    router.refresh();
  }

  const { posPoint, catalog, displayCategories, bomPreviews, materials } = data;

  const tabDefinitions = [
    { value: "menu", label: "Menu Items", count: catalog.length },
    { value: "categories", label: "Display Categories", count: displayCategories.length },
    { value: "recipes", label: "Recipes" },
  ] as const;

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "POS Points", href: "/management/pos" as Route },
        { label: posPoint.displayName, current: true },
      ]}
      header={{
        title: posPoint.displayName,
        eyebrow: "POS · TERMINAL",
        description: posPoint.name,
        status: (
          <StatusBadge
            status={posPoint.isActive ? "active" : "offline"}
            label={posPoint.isActive ? "Active" : "Inactive"}
            data-testid="pos-point-status"
          />
        ),
        "data-testid": "pos-point-detail-header",
      }}
      data-testid="pos-point-detail-shell"
    >
      <StatusTabBar
        tabs={tabDefinitions}
        paramKey={TAB_PARAM}
        defaultValue="menu"
        ariaLabel="POS point detail sections"
        data-testid="pos-detail-tabs"
      />

      {tab === "menu" && (
        <div role="tabpanel" id="pos-detail-panel-menu">
          <MenuTab
            posPointId={posPoint.id}
            catalog={catalog}
            displayCategories={displayCategories}
            materials={materials}
            canWrite={canWrite}
            onMutationSuccess={handleMutationSuccess}
          />
        </div>
      )}
      {tab === "categories" && (
        <div role="tabpanel" id="pos-detail-panel-categories">
          <CategoriesTab
            posPointId={posPoint.id}
            displayCategories={displayCategories}
            canWrite={canWrite}
            onMutationSuccess={handleMutationSuccess}
          />
        </div>
      )}
      {tab === "recipes" && (
        <div role="tabpanel" id="pos-detail-panel-recipes">
          <RecipesTab catalog={catalog} bomPreviews={bomPreviews} />
        </div>
      )}
    </DetailPageShell>
  );
}

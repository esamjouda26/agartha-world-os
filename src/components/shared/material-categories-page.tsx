"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { TreeWithSidePanel, TreeNewButton } from "@/components/shared/tree-with-side-panel";
import { JunctionManager } from "@/components/shared/junction-manager";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import type { TreeNode } from "@/components/ui/tree-view";

import type { MaterialCategoriesPageData, MaterialCategoryRow } from "@/features/procurement/types";
import {
  createMaterialCategorySchema,
  updateMaterialCategorySchema,
  type CreateMaterialCategoryInput,
  type UpdateMaterialCategoryInput,
} from "@/features/procurement/schemas/material-category";
import { createMaterialCategory } from "@/features/procurement/actions/create-material-category";
import { updateMaterialCategory } from "@/features/procurement/actions/update-material-category";
import { updateCategoryAllowedLocations } from "@/features/procurement/actions/update-category-allowed-locations";

const VALUATION_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "moving_avg", label: "Moving Average" },
  { value: "fifo", label: "FIFO" },
] as const;

type Props = Readonly<{
  data: MaterialCategoriesPageData;
  /** When false, all CRUD controls disabled. Server still gates via RLS. */
  canWrite: boolean;
  /** When false, the location-junction add/remove controls disable. */
  canAssignLocations: boolean;
}>;

// ── Helpers ────────────────────────────────────────────────────────────

function buildTreeNodes(rows: ReadonlyArray<MaterialCategoryRow>, search: string): TreeNode[] {
  const q = search.trim().toLowerCase();
  const matching = q
    ? new Set(
        rows
          .filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
          .map((r) => r.id),
      )
    : null;

  // When searching, also include every ancestor of a match so the tree
  // path stays visible. Build parent-id map first.
  const idToRow = new Map<string, MaterialCategoryRow>();
  for (const r of rows) idToRow.set(r.id, r);

  const visible = new Set<string>();
  if (matching) {
    for (const id of matching) {
      let cur: MaterialCategoryRow | undefined = idToRow.get(id);
      while (cur) {
        visible.add(cur.id);
        cur = cur.parentId ? idToRow.get(cur.parentId) : undefined;
      }
    }
  }

  const childrenByParent = new Map<string | null, MaterialCategoryRow[]>();
  for (const r of rows) {
    if (matching && !visible.has(r.id)) continue;
    const list = childrenByParent.get(r.parentId) ?? [];
    list.push(r);
    childrenByParent.set(r.parentId, list);
  }

  function build(parent: string | null): TreeNode[] {
    const kids = (childrenByParent.get(parent) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    return kids.map<TreeNode>((r) => {
      const children = build(r.id);
      const label = (
        <span className="flex items-center gap-2">
          <span>{r.name}</span>
          {!r.isActive ? (
            <StatusBadge
              status="inactive"
              variant="dot"
              data-testid={`category-tree-inactive-${r.id}`}
            />
          ) : null}
        </span>
      );
      return children.length === 0 ? { id: r.id, label } : { id: r.id, label, children };
    });
  }
  return build(null);
}

// ── Main component ─────────────────────────────────────────────────────

export function MaterialCategoriesPage({ data, canWrite, canAssignLocations }: Props) {
  const selectedIdState = useUrlString("id");
  const searchState = useUrlString("q");
  const [creatingUnderParent, setCreatingUnderParent] = React.useState<string | null | "root">(
    null,
  );

  const selected: MaterialCategoryRow | null = React.useMemo(
    () =>
      selectedIdState.value
        ? (data.categories.find((c) => c.id === selectedIdState.value) ?? null)
        : null,
    [selectedIdState.value, data.categories],
  );

  const treeNodes = React.useMemo(
    () => buildTreeNodes(data.categories, searchState.value ?? ""),
    [data.categories, searchState.value],
  );

  const defaultExpanded = React.useMemo(() => {
    // Expand top-level only by default; expand ancestors of the selection.
    const set = new Set<string>(data.categories.filter((c) => c.depth === 0).map((c) => c.id));
    if (selected) {
      const idToRow = new Map<string, MaterialCategoryRow>();
      for (const c of data.categories) idToRow.set(c.id, c);
      let cur = selected.parentId ? idToRow.get(selected.parentId) : undefined;
      while (cur) {
        set.add(cur.id);
        cur = cur.parentId ? idToRow.get(cur.parentId) : undefined;
      }
    }
    return set;
  }, [data.categories, selected]);

  const onCreate = (parentId: string | null): void => {
    setCreatingUnderParent(parentId === null ? "root" : parentId);
    selectedIdState.set(null);
  };

  return (
    <div className="flex flex-col gap-6" data-testid="material-categories-page">
      <PageHeader
        title="Material Categories"
        description="Hierarchical category tree shared by procurement and POS catalogs."
        data-testid="material-categories-header"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <UrlSearchInput
          param="q"
          placeholder="Search by name or code…"
          aria-label="Search categories"
          debounceMs={300}
          data-testid="material-categories-search"
          className="sm:max-w-sm"
        />
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onCreate(null)}
            data-testid="material-categories-create-root"
          >
            <Plus aria-hidden className="size-4" /> New root category
          </Button>
        ) : null}
      </div>

      <TreeWithSidePanel
        data-testid="material-categories-tree-panel"
        tree={{
          nodes: treeNodes,
          selectedId: selectedIdState.value,
          onSelect: (id) => {
            setCreatingUnderParent(null);
            selectedIdState.set(id);
          },
          defaultExpanded,
          "data-testid": "material-categories-tree",
        }}
        treeHeading="Categories"
        treeAction={
          canWrite && selected ? (
            <TreeNewButton
              label="+ Child"
              onClick={() => onCreate(selected.id)}
              data-testid="material-categories-create-child"
            />
          ) : null
        }
        panelPlaceholder={
          creatingUnderParent === null ? (
            <EmptyState
              icon={<Tags className="size-8" />}
              variant="first-use"
              title="Select a category"
              description="Pick a category in the tree to view or edit, or create a new root."
              frame="none"
              data-testid="material-categories-panel-empty"
            />
          ) : null
        }
        panel={
          creatingUnderParent !== null ? (
            <CreateForm
              parent={
                creatingUnderParent === "root"
                  ? null
                  : (data.categories.find((c) => c.id === creatingUnderParent) ?? null)
              }
              canWrite={canWrite}
              onCancel={() => setCreatingUnderParent(null)}
              onCreated={(id) => {
                setCreatingUnderParent(null);
                selectedIdState.set(id);
              }}
            />
          ) : selected ? (
            <EditPanel
              key={selected.id}
              category={selected}
              data={data}
              canWrite={canWrite}
              canAssignLocations={canAssignLocations}
            />
          ) : null
        }
      />
    </div>
  );
}

// ── Create form ────────────────────────────────────────────────────────

function CreateForm({
  parent,
  canWrite,
  onCancel,
  onCreated,
}: Readonly<{
  parent: MaterialCategoryRow | null;
  canWrite: boolean;
  onCancel: () => void;
  onCreated: (id: string) => void;
}>) {
  const form = useForm<CreateMaterialCategoryInput>({
    resolver: zodResolver(createMaterialCategorySchema) as Resolver<CreateMaterialCategoryInput>,
    defaultValues: {
      name: "",
      code: "",
      parentId: parent?.id ?? null,
      isBomEligible: parent?.isBomEligible ?? false,
      isConsumable: parent?.isConsumable ?? false,
      defaultValuation: null,
      accountingCategory: null,
      sortOrder: 0,
      isActive: true,
    },
  });

  const handleCreate = async (values: CreateMaterialCategoryInput): Promise<void> => {
    const result = await createMaterialCategory(values);
    if (result.success) {
      toastSuccess("Category created", { description: values.name });
      onCreated(result.data.categoryId);
    } else {
      toastError(result);
      if (result.fields) {
        for (const [field, message] of Object.entries(result.fields)) {
          form.setError(field as keyof CreateMaterialCategoryInput, {
            type: "server",
            message,
          });
        }
      }
    }
  };

  return (
    <FormProvider {...form}>
      <form
        id="create-category-form"
        onSubmit={form.handleSubmit(handleCreate as never)}
        className="flex flex-col gap-4"
        data-testid="material-categories-create-form"
      >
        <header className="flex flex-col gap-1">
          <h3 className="text-foreground text-base font-semibold">
            {parent ? `New child of "${parent.name}"` : "New root category"}
          </h3>
          <p className="text-foreground-muted text-xs">
            Create a new entry in the hierarchy. Code and name are unique within a parent.
          </p>
        </header>
        <CategoryFormFields control={form.control as never} canWrite={canWrite} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            data-testid="material-categories-create-cancel"
          >
            Cancel
          </Button>
          <FormSubmitButton
            size="sm"
            disabled={!canWrite}
            data-testid="material-categories-create-submit"
          >
            Create
          </FormSubmitButton>
        </div>
      </form>
    </FormProvider>
  );
}

// ── Edit panel (form + location junction) ──────────────────────────────

function EditPanel({
  category,
  data,
  canWrite,
  canAssignLocations,
}: Readonly<{
  category: MaterialCategoryRow;
  data: MaterialCategoriesPageData;
  canWrite: boolean;
  canAssignLocations: boolean;
}>) {
  const form = useForm<UpdateMaterialCategoryInput>({
    resolver: zodResolver(updateMaterialCategorySchema) as Resolver<UpdateMaterialCategoryInput>,
    defaultValues: {
      categoryId: category.id,
      name: category.name,
      isBomEligible: category.isBomEligible,
      isConsumable: category.isConsumable,
      defaultValuation: category.defaultValuation as "standard" | "moving_avg" | "fifo" | null,
      accountingCategory: category.accountingCategory,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    },
  });

  const handleSave = async (values: UpdateMaterialCategoryInput): Promise<void> => {
    const result = await updateMaterialCategory(values);
    if (result.success) {
      toastSuccess("Category updated", { description: values.name });
    } else {
      toastError(result);
      if (result.fields) {
        for (const [field, message] of Object.entries(result.fields)) {
          form.setError(field as keyof UpdateMaterialCategoryInput, {
            type: "server",
            message,
          });
        }
      }
    }
  };

  // ── Junction state — derived from props every render so server
  //    revalidation flows through naturally.
  const assignedLocationIds = React.useMemo(
    () =>
      data.locationCategories.filter((j) => j.categoryId === category.id).map((j) => j.locationId),
    [data.locationCategories, category.id],
  );

  const locationOptions = React.useMemo(
    () => data.locations.map((l) => ({ value: l.id, label: l.name })),
    [data.locations],
  );

  const [selectedForRemoval, setSelectedForRemoval] = React.useState<readonly string[]>([]);

  const handleAdd = async (locationIds: readonly string[]): Promise<void> => {
    const result = await updateCategoryAllowedLocations({
      categoryId: category.id,
      addLocationIds: [...locationIds],
      removeLocationIds: [],
    });
    if (result.success) {
      toastSuccess(
        result.data.added === 1 ? "1 location added" : `${result.data.added} locations added`,
      );
    } else {
      toastError(result);
    }
  };

  const handleRemove = async (locationIds: readonly string[]): Promise<void> => {
    const result = await updateCategoryAllowedLocations({
      categoryId: category.id,
      addLocationIds: [],
      removeLocationIds: [...locationIds],
    });
    if (result.success) {
      toastSuccess(
        result.data.removed === 1
          ? "1 location removed"
          : `${result.data.removed} locations removed`,
      );
      setSelectedForRemoval([]);
    } else {
      toastError(result);
    }
  };

  const assignedLocations = data.locationCategories.filter((j) => j.categoryId === category.id);

  return (
    <div className="flex flex-col gap-6" data-testid="material-categories-edit-panel">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-foreground text-base font-semibold">{category.name}</h3>
          <StatusBadge
            status={category.isActive ? "active" : "inactive"}
            variant="dot"
            data-testid="material-categories-edit-status"
          />
        </div>
        <p className="text-foreground-muted font-mono text-xs">{category.path}</p>
      </header>

      <FormProvider {...form}>
        <form
          id={`edit-category-form-${category.id}`}
          onSubmit={form.handleSubmit(handleSave as never)}
          className="flex flex-col gap-4"
          data-testid="material-categories-edit-form"
        >
          <CategoryFormFields
            control={form.control as never}
            canWrite={canWrite}
            disableCodeAndParent
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <FormSubmitButton
              size="sm"
              disabled={!canWrite}
              data-testid="material-categories-edit-submit"
            >
              Save changes
            </FormSubmitButton>
          </div>
        </form>
      </FormProvider>

      <FormSection
        title="Allowed in locations"
        description="Locations whose stock balance can include this category. Junction edits require system access."
      >
        <JunctionManager
          title=""
          options={locationOptions}
          assignedValues={assignedLocationIds}
          onAdd={handleAdd}
          onRemove={handleRemove}
          selectedForRemoval={selectedForRemoval}
          onSelectionClear={() => setSelectedForRemoval([])}
          disabled={!canAssignLocations}
          addLabel="Assign"
          pickerPlaceholder="Pick locations to allow…"
          data-testid="material-categories-locations-junction"
        >
          <ul className="flex flex-wrap gap-2" data-testid="material-categories-locations-list">
            {assignedLocations.length === 0 ? (
              <li className="text-foreground-muted text-sm">No locations assigned yet.</li>
            ) : (
              assignedLocations.map((row) => {
                const checked = selectedForRemoval.includes(row.locationId);
                return (
                  <li
                    key={row.locationId}
                    data-testid={`material-categories-location-chip-${row.locationId}`}
                  >
                    <label className="border-border-subtle bg-card hover:bg-surface/80 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors">
                      <input
                        type="checkbox"
                        className="size-3"
                        checked={checked}
                        disabled={!canAssignLocations}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForRemoval([...selectedForRemoval, row.locationId]);
                          } else {
                            setSelectedForRemoval(
                              selectedForRemoval.filter((id) => id !== row.locationId),
                            );
                          }
                        }}
                      />
                      {row.locationName}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </JunctionManager>
      </FormSection>
    </div>
  );
}

// ── Reusable form fields shared by Create + Edit forms ─────────────────

function CategoryFormFields({
  control,
  canWrite,
  disableCodeAndParent = false,
}: Readonly<{
  // Loose `unknown` resolver typing — both CreateInput and UpdateInput
  // share the relevant field names; constraining to a single generic
  // creates a TS variance issue across both forms.
  control: never;
  canWrite: boolean;
  disableCodeAndParent?: boolean;
}>) {
  return (
    <>
      <FormSection title="Identity">
        <FormRow>
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={!canWrite}
                    placeholder="Display name"
                    data-testid="material-categories-field-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {disableCodeAndParent ? null : (
            <FormField
              control={control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={!canWrite}
                      placeholder="lowercase_underscore"
                      data-testid="material-categories-field-code"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </FormRow>
      </FormSection>

      <FormSection title="Behavior">
        <FormRow>
          <FormField
            control={control}
            name="isBomEligible"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canWrite}
                    data-testid="material-categories-field-bom-eligible"
                  />
                </FormControl>
                <FormLabel className="!mt-0">BOM Eligible</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="isConsumable"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canWrite}
                    data-testid="material-categories-field-consumable"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Consumable</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canWrite}
                    data-testid="material-categories-field-active"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
        </FormRow>
      </FormSection>

      <FormSection title="Accounting">
        <FormRow>
          <FormField
            control={control}
            name="defaultValuation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Valuation</FormLabel>
                <Select
                  value={field.value ?? "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  disabled={!canWrite}
                >
                  <FormControl>
                    <SelectTrigger data-testid="material-categories-field-valuation">
                      <SelectValue placeholder="Inherit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Inherit</SelectItem>
                    {VALUATION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="accountingCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accounting Category</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    disabled={!canWrite}
                    placeholder="e.g. COGS-Food"
                    data-testid="material-categories-field-accounting"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sort Order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    disabled={!canWrite}
                    data-testid="material-categories-field-sort"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormRow>
      </FormSection>
    </>
  );
}

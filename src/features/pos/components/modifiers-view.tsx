"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, ChevronDown, ChevronRight } from "lucide-react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type { Route } from "next";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { JunctionManager } from "@/components/shared/junction-manager";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
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
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  ModifierPageData,
  ModifierGroupRow,
  ModifierOptionRow,
} from "@/features/pos/types/management";
import { upsertModifierGroup } from "@/features/pos/actions/upsert-modifier-group";
import { upsertModifierOption } from "@/features/pos/actions/upsert-modifier-option";
import { syncModifierAssignments } from "@/features/pos/actions/sync-modifier-assignments";
import {
  upsertModifierGroupSchema,
  type UpsertModifierGroupInput,
  upsertModifierOptionSchema,
  type UpsertModifierOptionInput,
} from "@/features/pos/schemas/modifier";
import type { FieldPath } from "react-hook-form";

// ── Constants ────────────────────────────────────────────────────────────

const SEARCH_PARAM = "q";
const ACTIVE_PARAM = "active";

const MOBILE_GROUP_COLS = ["displayName", "isActive"] as const;
const MOBILE_OPTION_COLS = ["name", "priceDelta"] as const;
const MOBILE_ASSIGN_COLS = ["materialName"] as const;

const ACTIVE_VALUES = ["active", "inactive"] as const;
type ActiveFilter = (typeof ACTIVE_VALUES)[number];
const ACTIVE_LABELS: Record<ActiveFilter, string> = {
  active: "Active only",
  inactive: "Inactive only",
};

// ── Formatters ───────────────────────────────────────────────────────────

function formatPriceDelta(cents: number): string {
  if (cents === 0) return "—";
  const sign = cents > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 }).format(cents / 100)}`;
}

// ── Props ────────────────────────────────────────────────────────────────

type ModifiersViewProps = Readonly<{
  data: ModifierPageData;
  canWrite: boolean;
  posPointId: string;
}>;

// ── Modifier Group Form ───────────────────────────────────────────────────

type GroupFormProps = Readonly<{
  posPointId: string;
  defaultValues: UpsertModifierGroupInput;
  onSuccess: () => void;
}>;

function ModifierGroupForm({ posPointId, defaultValues, onSuccess }: GroupFormProps) {
  const form = useForm<UpsertModifierGroupInput>({
    resolver: zodResolver(upsertModifierGroupSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertModifierGroupInput) {
    const res = await upsertModifierGroup(values, posPointId);
    if (res.success) {
      toastSuccess(values.id ? "Group updated." : "Group created.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertModifierGroupInput>, { type: "server", message });
      }
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4" data-testid="modifier-group-form">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Internal name</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. milk-type" data-testid="modifier-group-form-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="displayName" render={({ field }) => (
          <FormItem>
            <FormLabel>Display name</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. Milk Type" data-testid="modifier-group-form-display-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="minSelections" render={({ field }) => (
            <FormItem>
              <FormLabel>Min</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} data-testid="modifier-group-form-min" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="maxSelections" render={({ field }) => (
            <FormItem>
              <FormLabel>Max</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="1" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)} data-testid="modifier-group-form-max" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="sortOrder" render={({ field }) => (
          <FormItem>
            <FormLabel>Sort order</FormLabel>
            <FormControl>
              <Input type="number" min="0" step="1" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} data-testid="modifier-group-form-sort" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} id="modifier-group-is-active" data-testid="modifier-group-form-is-active" />
              </FormControl>
              <Label htmlFor="modifier-group-is-active">Active</Label>
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <FormSubmitButton data-testid="modifier-group-form-submit">
          {defaultValues.id ? "Update group" : "Create group"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Modifier Option Form ──────────────────────────────────────────────────

type OptionFormProps = Readonly<{
  posPointId: string;
  defaultValues: UpsertModifierOptionInput;
  allMaterials: ReadonlyArray<{ id: string; name: string }>;
  onSuccess: () => void;
}>;

function ModifierOptionForm({ posPointId, defaultValues, allMaterials, onSuccess }: OptionFormProps) {
  const form = useForm<UpsertModifierOptionInput>({
    resolver: zodResolver(upsertModifierOptionSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertModifierOptionInput) {
    const res = await upsertModifierOption(values, posPointId);
    if (res.success) {
      toastSuccess(values.id ? "Option updated." : "Option created.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertModifierOptionInput>, { type: "server", message });
      }
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4" data-testid="modifier-option-form">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. Oat Milk" data-testid="modifier-option-form-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="priceDelta" render={({ field }) => (
          <FormItem>
            <FormLabel>Price delta (MYR)</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="0.00" value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} data-testid="modifier-option-form-price-delta" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="materialId" render={({ field }) => (
          <FormItem>
            <FormLabel>Linked material (optional)</FormLabel>
            <SearchableSelect
              options={allMaterials.map((m) => ({ value: m.id, label: m.name }))}
              value={field.value ?? null}
              onChange={(v) => field.onChange(v ?? undefined)}
              placeholder="None"
              data-testid="modifier-option-form-material"
            />
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="quantityDelta" render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity delta</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                data-testid="modifier-option-form-quantity-delta"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="sortOrder" render={({ field }) => (
          <FormItem>
            <FormLabel>Sort order</FormLabel>
            <FormControl>
              <Input type="number" min="0" step="1" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} data-testid="modifier-option-form-sort" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} id="modifier-option-is-active" data-testid="modifier-option-form-is-active" />
              </FormControl>
              <Label htmlFor="modifier-option-is-active">Active</Label>
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <FormSubmitButton data-testid="modifier-option-form-submit">
          {defaultValues.id ? "Update option" : "Add option"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Options Sub-table (renderSubComponent) ────────────────────────────────

type OptionsSubTableProps = Readonly<{
  group: ModifierGroupRow;
  posPointId: string;
  allMaterials: ReadonlyArray<{ id: string; name: string }>;
  canWrite: boolean;
  onMutationSuccess: () => void;
}>;

function OptionsSubTable({ group, posPointId, allMaterials, canWrite, onMutationSuccess }: OptionsSubTableProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ModifierOptionRow | null>(null);

  function closeSheet() { setSheetOpen(false); setEditTarget(null); onMutationSuccess(); }

  const columns = React.useMemo<ColumnDef<ModifierOptionRow>[]>(() => [
    { id: "name", accessorKey: "name", header: "Option name" },
    { id: "priceDelta", header: "Price delta", cell: ({ row }) => formatPriceDelta(row.original.priceDelta) },
    { id: "materialName", header: "Material", cell: ({ row }) => row.original.materialName ?? "—" },
    {
      id: "isActive",
      header: "Active",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? "active" : "offline"}
          label={row.original.isActive ? "Active" : "Inactive"}
          data-testid={`option-status-${row.original.id}`}
        />
      ),
    },
    ...(canWrite
      ? ([{
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }: { row: { original: ModifierOptionRow } }) => (
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditTarget(row.original); setSheetOpen(true); }} aria-label={`Edit ${row.original.name}`} data-testid={`option-edit-${row.original.id}`}>
              <Edit className="size-4" aria-hidden />
            </Button>
          ),
        }] satisfies ColumnDef<ModifierOptionRow>[])
      : []),
  ], [canWrite]);

  const defaultFormValues: UpsertModifierOptionInput = editTarget
    ? { id: editTarget.id, groupId: group.id, name: editTarget.name, priceDelta: editTarget.priceDelta / 100, materialId: editTarget.materialId ?? undefined, quantityDelta: editTarget.quantityDelta, sortOrder: editTarget.sortOrder, isActive: editTarget.isActive }
    : { groupId: group.id, name: "", priceDelta: 0, quantityDelta: 0, sortOrder: group.options.length, isActive: true };

  return (
    <div className="px-4 pb-4" data-testid={`options-subtable-${group.id}`}>
      {canWrite && (
        <div className="mb-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => { setEditTarget(null); setSheetOpen(true); }} data-testid={`option-add-${group.id}`}>
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Add option
          </Button>
        </div>
      )}
      <DataTable
        data={group.options}
        columns={columns}
        mobileFieldPriority={MOBILE_OPTION_COLS}
        getRowId={(row) => row.id}
        toolbar="none"
        frame="none"
        data-testid={`options-table-${group.id}`}
      />
      <FormSheet open={sheetOpen} onOpenChange={setSheetOpen} title={editTarget ? "Edit option" : "Add option"} hideFooter data-testid="modifier-option-sheet">
        <ModifierOptionForm
          key={editTarget?.id ?? `create-${group.id}`}
          posPointId={posPointId}
          defaultValues={defaultFormValues}
          allMaterials={allMaterials}
          onSuccess={closeSheet}
        />
      </FormSheet>
    </div>
  );
}

// ── Assignments Section ───────────────────────────────────────────────────

type AssignmentsSectionProps = Readonly<{
  posPointId: string;
  data: ModifierPageData;
  canWrite: boolean;
  onMutationSuccess: () => void;
}>;

type AssignmentRow = Readonly<{
  materialId: string;
  materialName: string;
  assignedGroupIds: readonly string[];
}>;

function AssignmentsSection({ posPointId, data, canWrite, onMutationSuccess }: AssignmentsSectionProps) {
  const [activeMatId, setActiveMatId] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  const assignmentsByMaterial = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of data.assignments) {
      const existing = map.get(a.materialId) ?? [];
      map.set(a.materialId, [...existing, a.modifierGroupId]);
    }
    return map;
  }, [data.assignments]);

  const rows: AssignmentRow[] = data.materials.map((m) => ({
    materialId: m.id,
    materialName: m.name,
    assignedGroupIds: assignmentsByMaterial.get(m.id) ?? [],
  }));

  const groupOptions = data.groups.map((g) => ({ value: g.id, label: g.displayName }));

  const columns = React.useMemo<ColumnDef<AssignmentRow>[]>(() => [
    { id: "materialName", accessorKey: "materialName", header: "Menu item" },
    {
      id: "groups",
      header: "Assigned modifier groups",
      cell: ({ row }) => {
        const names = row.original.assignedGroupIds.map(
          (id) => data.groups.find((g) => g.id === id)?.displayName ?? id,
        );
        return names.length > 0 ? names.join(", ") : <span className="text-foreground-muted">None</span>;
      },
    },
    ...(canWrite
      ? ([{
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }: { row: { original: AssignmentRow } }) => (
            <Button variant="ghost" size="sm" onClick={() => setActiveMatId(row.original.materialId)} data-testid={`assign-edit-${row.original.materialId}`}>
              Edit
            </Button>
          ),
        }] satisfies ColumnDef<AssignmentRow>[])
      : []),
  ], [canWrite, data.groups]);

  const activeMaterial = rows.find((r) => r.materialId === activeMatId);

  async function handleAdd(values: readonly string[]) {
    if (!activeMaterial) return;
    setIsPending(true);
    const newIds = [...new Set([...activeMaterial.assignedGroupIds, ...values])];
    const res = await syncModifierAssignments({ materialId: activeMaterial.materialId, modifierGroupIds: newIds }, posPointId);
    setIsPending(false);
    if (res.success) { toastSuccess("Assignments updated."); setActiveMatId(null); onMutationSuccess(); }
    else toastError(res);
  }

  async function handleRemove(values: readonly string[]) {
    if (!activeMaterial) return;
    setIsPending(true);
    const newIds = activeMaterial.assignedGroupIds.filter((id) => !values.includes(id));
    const res = await syncModifierAssignments({ materialId: activeMaterial.materialId, modifierGroupIds: [...newIds] }, posPointId);
    setIsPending(false);
    if (res.success) { toastSuccess("Assignments updated."); onMutationSuccess(); }
    else toastError(res);
  }

  return (
    <SectionCard title="Modifier Assignments" description="Link modifier groups to catalog items." data-testid="assignments-section">
      <FilterableDataTable
        table={{
          data: rows,
          columns,
          mobileFieldPriority: MOBILE_ASSIGN_COLS,
          getRowId: (row) => row.materialId,
          "data-testid": "assignments-table",
        }}
        emptyState={{ title: "No catalog items for this terminal.", variant: "first-use" }}
        data-testid="assignments-filterable"
      />

      {activeMaterial && (
        <div className="mt-4 rounded-xl border p-4" data-testid="assignment-junction-manager">
          <JunctionManager
            title={`Modifiers for: ${activeMaterial.materialName}`}
            options={groupOptions}
            assignedValues={[...activeMaterial.assignedGroupIds]}
            onAdd={handleAdd}
            onRemove={handleRemove}
            disabled={isPending}
            addLabel="Assign"
            removeLabel="Unassign"
            data-testid="junction-manager"
          >
            <ul className="flex flex-wrap gap-2 py-2">
              {activeMaterial.assignedGroupIds.map((id) => {
                const group = data.groups.find((g) => g.id === id);
                return (
                  <li key={id} className="bg-surface rounded-md px-2 py-1 text-sm">
                    {group?.displayName ?? id}
                  </li>
                );
              })}
              {activeMaterial.assignedGroupIds.length === 0 && (
                <li className="text-foreground-muted text-sm">No groups assigned yet.</li>
              )}
            </ul>
          </JunctionManager>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setActiveMatId(null)} data-testid="assignment-close">
              Done
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────

export function ModifiersView({ data, canWrite, posPointId }: ModifiersViewProps) {
  const router = useRouter();
  const search = useUrlString(SEARCH_PARAM);
  const activeFilter = useUrlString(ACTIVE_PARAM);
  const [groupSheetOpen, setGroupSheetOpen] = React.useState(false);
  const [editGroup, setEditGroup] = React.useState<ModifierGroupRow | null>(null);

  function openCreateGroup() {
    setEditGroup(null);
    setGroupSheetOpen(true);
  }
  function openEditGroup(row: ModifierGroupRow) {
    setEditGroup(row);
    setGroupSheetOpen(true);
  }
  function handleSheetOpenChange(open: boolean) {
    setGroupSheetOpen(open);
    if (!open) setEditGroup(null);
  }
  function handleSuccess() {
    setGroupSheetOpen(false);
    setEditGroup(null);
    router.refresh();
  }
  function handleMutationSuccess() {
    router.refresh();
  }

  // ── Filter logic ──────────────────────────────────────────────────────
  const filteredGroups = React.useMemo(() => {
    let result = [...data.groups];

    if (activeFilter.value === "active") {
      result = result.filter((g) => g.isActive);
    } else if (activeFilter.value === "inactive") {
      result = result.filter((g) => !g.isActive);
    }

    const q = search.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.displayName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [data.groups, search.value, activeFilter.value]);

  const hasActiveFilters = Boolean(search.value || activeFilter.value);

  const resetAll = () => {
    search.set(null);
    activeFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (activeFilter.value && ACTIVE_VALUES.includes(activeFilter.value as ActiveFilter)) {
    chips.push(
      <FilterChip
        key="active"
        name="Status"
        label={ACTIVE_LABELS[activeFilter.value as ActiveFilter]}
        onRemove={() => activeFilter.set(null)}
        data-testid="modifiers-chip-active"
      />,
    );
  }

  // ── Columns ──────────────────────────────────────────────────────────
  const groupColumns = React.useMemo<ColumnDef<ModifierGroupRow>[]>(() => [
    {
      id: "expander",
      header: () => <span className="sr-only">Expand</span>,
      cell: ({ row }: { row: Row<ModifierGroupRow> }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            row.getToggleExpandedHandler()();
          }}
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          data-testid={`group-expand-${row.original.id}`}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </Button>
      ),
    },
    {
      id: "displayName",
      accessorKey: "displayName",
      header: "Group name",
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.displayName}</span>
      ),
    },
    {
      id: "selections",
      header: "Selections",
      cell: ({ row }) => `${row.original.minSelections}–${row.original.maxSelections}`,
    },
    {
      id: "optionCount",
      header: "Options",
      cell: ({ row }) => row.original.options.length,
    },
    {
      id: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? "active" : "offline"}
          label={row.original.isActive ? "Active" : "Inactive"}
          data-testid={`group-status-${row.original.id}`}
        />
      ),
    },
    ...(canWrite
      ? ([{
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }: { row: { original: ModifierGroupRow } }) => (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEditGroup(row.original);
              }}
              aria-label={`Edit ${row.original.displayName}`}
              data-testid={`group-edit-${row.original.id}`}
            >
              <Edit className="size-4" aria-hidden />
            </Button>
          ),
        }] satisfies ColumnDef<ModifierGroupRow>[])
      : []),
  ], [canWrite]);

  const defaultGroupValues: UpsertModifierGroupInput = editGroup
    ? {
        id: editGroup.id,
        name: editGroup.name,
        displayName: editGroup.displayName,
        minSelections: editGroup.minSelections,
        maxSelections: editGroup.maxSelections,
        sortOrder: editGroup.sortOrder,
        isActive: editGroup.isActive,
      }
    : {
        name: "",
        displayName: "",
        minSelections: 0,
        maxSelections: 1,
        sortOrder: data.groups.length,
        isActive: true,
      };

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "POS Points", href: "/management/pos" as Route },
        { label: data.posPoint.displayName, href: `/management/pos/${posPointId}` as Route },
        { label: "Modifiers", current: true },
      ]}
      header={{
        title: "Modifier Groups",
        eyebrow: `${data.posPoint.displayName} · POS`,
        description: "Configure modifier groups, options, and assign them to menu items.",
        "data-testid": "modifiers-detail-header",
        ...(canWrite
          ? {
              primaryAction: (
                <Button onClick={openCreateGroup} data-testid="group-add-btn">
                  <Plus aria-hidden className="size-4" />
                  New group
                </Button>
              ),
            }
          : {}),
      }}
      data-testid="modifiers-shell"
    >
      <FilterableDataTable<ModifierGroupRow>
        toolbar={
          <FilterBar
            data-testid="modifiers-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search groups…"
                aria-label="Search modifier groups"
                debounceMs={300}
                data-testid="modifiers-search"
              />
            }
            controls={
              <Select
                value={activeFilter.value ?? "all"}
                onValueChange={(next) => activeFilter.set(next === "all" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Status filter"
                  data-testid="modifiers-filter-active"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ACTIVE_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ACTIVE_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredGroups,
          columns: groupColumns,
          mobileFieldPriority: MOBILE_GROUP_COLS,
          getRowId: (row) => row.id,
          renderSubComponent: (row) => (
            <OptionsSubTable
              group={row.original}
              posPointId={posPointId}
              allMaterials={data.materials}
              canWrite={canWrite}
              onMutationSuccess={handleMutationSuccess}
            />
          ),
          "data-testid": "modifier-groups-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No groups match your filters.", variant: "filtered-out" }
            : { title: "No modifier groups yet.", variant: "first-use" }
        }
        data-testid="modifier-groups-filterable"
      />

      <AssignmentsSection
        posPointId={posPointId}
        data={data}
        canWrite={canWrite}
        onMutationSuccess={handleMutationSuccess}
      />

      <FormSheet
        open={groupSheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editGroup ? "Edit modifier group" : "New modifier group"}
        hideFooter
        data-testid="modifier-group-sheet"
      >
        <ModifierGroupForm
          key={editGroup?.id ?? "create"}
          posPointId={posPointId}
          defaultValues={defaultGroupValues}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </DetailPageShell>
  );
}

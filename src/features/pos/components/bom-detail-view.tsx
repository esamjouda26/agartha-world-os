"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Copy, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import type { FieldPath } from "react-hook-form";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  BomDetailData,
  BomComponentRow,
} from "@/features/pos/types/management";
import { upsertBomComponent } from "@/features/pos/actions/upsert-bom-component";
import { deleteBomComponent } from "@/features/pos/actions/delete-bom-component";
import { cloneBom } from "@/features/pos/actions/clone-bom";
import { activateBom } from "@/features/pos/actions/activate-bom";
import {
  upsertBomComponentSchema,
  type UpsertBomComponentInput,
} from "@/features/pos/schemas/bom";
import { parseIsoDateLocal } from "@/lib/date";

// ── Constants ────────────────────────────────────────────────────────────

const SEARCH_PARAM = "q";
const MOBILE_COLUMNS = ["componentMaterialName", "quantity", "isPhantom"] as const;

// ── Formatters ───────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(parseIsoDateLocal(iso), "dd MMM yyyy");
}

// ── Props ───────────────────────────────────────────────────────────────

type BomDetailViewProps = Readonly<{
  data: BomDetailData;
  canWrite: boolean;
  canDelete: boolean;
}>;

// ── Component Form ───────────────────────────────────────────────────────

type ComponentFormProps = Readonly<{
  defaultValues: UpsertBomComponentInput;
  materials: ReadonlyArray<{ id: string; name: string }>;
  onSuccess: () => void;
}>;

function BomComponentForm({ defaultValues, materials, onSuccess }: ComponentFormProps) {
  const form = useForm<UpsertBomComponentInput>({
    resolver: zodResolver(upsertBomComponentSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertBomComponentInput) {
    const res = await upsertBomComponent(values);
    if (res.success) {
      toastSuccess(values.id ? "Component updated." : "Component added.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertBomComponentInput>, { type: "server", message });
      }
    } else if (res.error === "CONFLICT") {
      form.setError("componentMaterialId", {
        type: "server",
        message: "This material is already a component of this BOM.",
      });
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
        data-testid="bom-component-form"
      >
        <FormField
          control={form.control}
          name="componentMaterialId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Component material</FormLabel>
              <SearchableSelect
                options={materials.map((m) => ({ value: m.id, label: m.name }))}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? "")}
                placeholder="Search materials…"
                data-testid="bom-component-form-material"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="bom-component-form-quantity"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scrapPct"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scrap % (0–99.99)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99.99"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="bom-component-form-scrap-pct"
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
                  data-testid="bom-component-form-sort-order"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPhantom"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="bom-component-is-phantom"
                    data-testid="bom-component-form-is-phantom"
                  />
                </FormControl>
                <Label htmlFor="bom-component-is-phantom">
                  Phantom (auto-explode at order time)
                </Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton data-testid="bom-component-form-submit">
          {defaultValues.id ? "Update component" : "Add component"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Main view ────────────────────────────────────────────────────────────

export function BomDetailView({ data, canWrite, canDelete }: BomDetailViewProps) {
  const router = useRouter();
  const search = useUrlString(SEARCH_PARAM);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<BomComponentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<BomComponentRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activateConfirmOpen, setActivateConfirmOpen] = React.useState(false);
  const [isActivating, setIsActivating] = React.useState(false);
  const [isCloning, setIsCloning] = React.useState(false);

  const { bom, components, materials } = data;

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }
  function openEdit(row: BomComponentRow) {
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteBomComponent({ componentId: deleteTarget.id, bomId: bom.id });
    setIsDeleting(false);
    if (res.success) {
      toastSuccess("Component removed.");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toastError(res);
    }
  }

  async function handleActivate() {
    setIsActivating(true);
    const res = await activateBom({ bomId: bom.id });
    setIsActivating(false);
    if (res.success) {
      toastSuccess("BOM activated.");
      setActivateConfirmOpen(false);
      router.refresh();
    } else {
      toastError(res);
    }
  }

  async function handleClone() {
    setIsCloning(true);
    const res = await cloneBom({ sourceBomId: bom.id, version: bom.version + 1 });
    setIsCloning(false);
    if (res.success) {
      toastSuccess("BOM cloned as new draft.");
      router.push(`/management/pos/bom/${res.data.bomId}`);
    } else {
      toastError(res);
    }
  }

  // ── Filter ──────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    if (!search.value) return components;
    const q = search.value.toLowerCase();
    return components.filter((c) => c.componentMaterialName.toLowerCase().includes(q));
  }, [components, search.value]);

  const hasActiveFilters = Boolean(search.value);

  // ── Columns ─────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<BomComponentRow>[]>(
    () => [
      {
        id: "componentMaterialName",
        accessorKey: "componentMaterialName",
        header: "Component",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.componentMaterialName}
          </span>
        ),
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: "Quantity",
      },
      {
        id: "scrapPct",
        accessorKey: "scrapPct",
        header: "Scrap %",
        cell: ({ row }) => `${row.original.scrapPct}%`,
      },
      {
        id: "isPhantom",
        accessorKey: "isPhantom",
        header: "Phantom",
        cell: ({ row }) => (row.original.isPhantom ? "Yes" : "No"),
      },
      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        header: "Sort",
      },
      ...(canWrite
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: BomComponentRow } }) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(row.original);
                    }}
                    aria-label={`Edit ${row.original.componentMaterialName}`}
                    data-testid={`bom-component-edit-${row.original.id}`}
                  >
                    <Edit className="size-4" aria-hidden />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(row.original);
                      }}
                      aria-label={`Remove ${row.original.componentMaterialName}`}
                      data-testid={`bom-component-delete-${row.original.id}`}
                    >
                      <Trash2 className="size-4 text-status-danger-foreground" aria-hidden />
                    </Button>
                  )}
                </div>
              ),
            },
          ] satisfies ColumnDef<BomComponentRow>[])
        : []),
    ],
    [canWrite, canDelete],
  );

  const defaultFormValues: UpsertBomComponentInput = editTarget
    ? {
        id: editTarget.id,
        bomId: bom.id,
        componentMaterialId: editTarget.componentMaterialId,
        quantity: editTarget.quantity,
        scrapPct: editTarget.scrapPct,
        isPhantom: editTarget.isPhantom,
        sortOrder: editTarget.sortOrder,
      }
    : {
        bomId: bom.id,
        componentMaterialId: "",
        quantity: 1,
        scrapPct: 0,
        isPhantom: false,
        sortOrder: components.length,
      };

  const isDraft = bom.status === "draft";
  const eyebrow = `${bom.parentMaterialName.toUpperCase()} · BOM v${bom.version}`;

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "Bill of Materials", href: "/management/pos/bom" as Route },
        { label: `${bom.parentMaterialName} v${bom.version}`, current: true },
      ]}
      header={{
        title: `${bom.parentMaterialName} — v${bom.version}`,
        eyebrow,
        description: `Effective ${formatDate(bom.effectiveFrom)}${bom.effectiveTo ? ` – ${formatDate(bom.effectiveTo)}` : " onward"}${bom.isDefault ? " · Default" : ""}`,
        status: (
          <StatusBadge
            status={bom.status}
            data-testid="bom-detail-status"
          />
        ),
        secondaryActions: canWrite ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClone}
              disabled={isCloning}
              data-testid="bom-clone-btn"
            >
              <Copy aria-hidden className="size-4" />
              Clone as new version
            </Button>
            {isDraft && (
              <Button
                size="sm"
                onClick={() => setActivateConfirmOpen(true)}
                disabled={isActivating || components.length === 0}
                data-testid="bom-activate-btn"
              >
                <CheckCircle2 aria-hidden className="size-4" />
                Activate
              </Button>
            )}
          </div>
        ) : undefined,
        ...(canWrite
          ? {
              primaryAction: (
                <Button onClick={openCreate} data-testid="bom-component-add-btn">
                  <Plus aria-hidden className="size-4" />
                  Add component
                </Button>
              ),
            }
          : {}),
        "data-testid": "bom-detail-header",
      }}
      data-testid="bom-detail-shell"
    >
      <FilterableDataTable<BomComponentRow>
        toolbar={
          <FilterBar
            data-testid="bom-detail-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={() => search.set(null)}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search components…"
                aria-label="Search components"
                debounceMs={300}
                data-testid="bom-detail-search"
              />
            }
          />
        }
        table={{
          data: filtered,
          columns,
          mobileFieldPriority: MOBILE_COLUMNS,
          getRowId: (row) => row.id,
          "data-testid": "bom-components-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No components match your search.", variant: "filtered-out" }
            : { title: "No components yet — add ingredients.", variant: "first-use" }
        }
        data-testid="bom-components-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit component" : "Add component"}
        hideFooter
        data-testid="bom-component-sheet"
      >
        <BomComponentForm
          key={editTarget?.id ?? "create"}
          defaultValues={defaultFormValues}
          materials={materials}
          onSuccess={handleSuccess}
        />
      </FormSheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove this component?"
        description={
          deleteTarget
            ? `"${deleteTarget.componentMaterialName}" will be removed from this BOM.`
            : undefined
        }
        intent="destructive"
        confirmLabel="Remove"
        onConfirm={handleDelete}
        pending={isDeleting}
        data-testid="bom-component-delete-dialog"
      />

      <ConfirmDialog
        open={activateConfirmOpen}
        onOpenChange={setActivateConfirmOpen}
        title="Activate this BOM?"
        description="This BOM will become the active version. Any previous active+default BOM for this material will be marked obsolete."
        intent="info"
        confirmLabel="Activate"
        onConfirm={handleActivate}
        pending={isActivating}
        data-testid="bom-activate-dialog"
      />
    </DetailPageShell>
  );
}

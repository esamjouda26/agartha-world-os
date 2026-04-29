"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit } from "lucide-react";
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
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  PriceListDetailData,
  PriceListItemRow,
  PriceListRow,
} from "@/features/pos/types/management";
import { upsertPriceListItem } from "@/features/pos/actions/upsert-price-list-item";
import {
  upsertPriceListItemSchema,
  type UpsertPriceListItemInput,
} from "@/features/pos/schemas/price-list-item";
import { parseIsoDateLocal } from "@/lib/date";
import { formatCents } from "@/lib/money";

// ── Constants ────────────────────────────────────────────────────────────

const SEARCH_PARAM = "q";
const PP_PARAM = "pp";

const MOBILE_COLUMNS = ["materialName", "unitPrice", "posPointName"] as const;

// ── Status resolver (header badge) ───────────────────────────────────────

type PriceListStatus = "currently_active" | "active" | "expired" | "scheduled";

function resolveStatus(row: PriceListRow): PriceListStatus {
  const today = format(new Date(), "yyyy-MM-dd");
  if (row.validFrom > today) return "scheduled";
  if (row.validTo && row.validTo < today) return "expired";
  if (row.isDefault) return "currently_active";
  return "active";
}

const STATUS_TONE: Record<
  PriceListStatus,
  { token: string; label: string; tone: "success" | "info" | "neutral" | "warning" }
> = {
  currently_active: { token: "active", label: "Currently Active", tone: "success" },
  active: { token: "active", label: "Active", tone: "info" },
  expired: { token: "expired", label: "Expired", tone: "neutral" },
  scheduled: { token: "scheduled", label: "Scheduled", tone: "warning" },
};

// ── Formatters ──────────────────────────────────────────────────────────

/**
 * Local wrapper around `formatCents` that adds an invalid-currency safety
 * net. Price-list rows surface a user-supplied `currency` column; if a
 * legacy/typo value sneaks through, falling back to plain text avoids a
 * runtime exception in the table cell. All other call sites use
 * `formatCents` directly because their currency values are constants.
 */
function formatCurrency(cents: number, currency: string): string {
  try {
    return formatCents(cents, currency);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(parseIsoDateLocal(iso), "dd MMM yyyy");
}

// ── Props ───────────────────────────────────────────────────────────────

type PriceListDetailViewProps = Readonly<{
  data: PriceListDetailData;
  canWrite: boolean;
}>;

// ── Form ─────────────────────────────────────────────────────────────────

type PriceListItemFormProps = Readonly<{
  defaultValues: UpsertPriceListItemInput;
  materials: ReadonlyArray<{ id: string; name: string }>;
  posPoints: ReadonlyArray<{ id: string; displayName: string }>;
  onSuccess: () => void;
}>;

function PriceListItemForm({
  defaultValues,
  materials,
  posPoints,
  onSuccess,
}: PriceListItemFormProps) {
  const form = useForm<UpsertPriceListItemInput>({
    resolver: zodResolver(upsertPriceListItemSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertPriceListItemInput) {
    const res = await upsertPriceListItem(values);
    if (res.success) {
      toastSuccess(values.id ? "Line item updated." : "Line item added.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertPriceListItemInput>, { type: "server", message });
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
        data-testid="price-list-item-form"
      >
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
                data-testid="price-list-item-form-material"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="posPointId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>POS point (optional — leave blank for all terminals)</FormLabel>
              <Select
                value={field.value ?? "all"}
                onValueChange={(v) => field.onChange(v === "all" ? undefined : v)}
              >
                <FormControl>
                  <SelectTrigger data-testid="price-list-item-form-pp">
                    <SelectValue placeholder="All terminals" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All terminals</SelectItem>
                  {posPoints.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
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
          name="unitPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="price-list-item-form-unit-price"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="minQty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                  data-testid="price-list-item-form-min-qty"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton data-testid="price-list-item-form-submit">
          {defaultValues.id ? "Update line item" : "Add line item"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Main view ────────────────────────────────────────────────────────────

export function PriceListDetailView({ data, canWrite }: PriceListDetailViewProps) {
  const router = useRouter();
  const search = useUrlString(SEARCH_PARAM);
  const ppFilter = useUrlString(PP_PARAM);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PriceListItemRow | null>(null);

  const { priceList, items, materials, posPoints } = data;

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }
  function openEdit(row: PriceListItemRow) {
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

  // ── Filter logic ─────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = [...items];

    if (ppFilter.value === "all-terminals") {
      result = result.filter((r) => r.posPointId === null);
    } else if (ppFilter.value) {
      result = result.filter((r) => r.posPointId === ppFilter.value);
    }

    const q = search.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.materialName.toLowerCase().includes(q) ||
          (r.posPointName ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, search.value, ppFilter.value]);

  const hasActiveFilters = Boolean(search.value || ppFilter.value);
  const resetAll = () => {
    search.set(null);
    ppFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (ppFilter.value) {
    const label =
      ppFilter.value === "all-terminals"
        ? "All terminals (global rows)"
        : (posPoints.find((p) => p.id === ppFilter.value)?.displayName ?? ppFilter.value);
    chips.push(
      <FilterChip
        key="pp"
        name="Terminal"
        label={label}
        onRemove={() => ppFilter.set(null)}
        data-testid="price-list-detail-chip-pp"
      />,
    );
  }

  // ── Columns ──────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<PriceListItemRow>[]>(
    () => [
      {
        id: "materialName",
        accessorKey: "materialName",
        header: "Material",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.materialName}</span>
        ),
      },
      {
        id: "posPointName",
        header: "Terminal",
        cell: ({ row }) =>
          row.original.posPointName ? (
            row.original.posPointName
          ) : (
            <span className="text-foreground-muted">All terminals</span>
          ),
      },
      {
        id: "unitPrice",
        accessorKey: "unitPrice",
        header: "Unit price",
        cell: ({ row }) => formatCurrency(row.original.unitPrice, priceList.currency),
      },
      {
        id: "minQty",
        accessorKey: "minQty",
        header: "Min qty",
      },
      ...(canWrite
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: PriceListItemRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(row.original);
                  }}
                  aria-label={`Edit ${row.original.materialName}`}
                  data-testid={`price-list-item-edit-${row.original.id}`}
                >
                  <Edit className="size-4" aria-hidden />
                </Button>
              ),
            },
          ] satisfies ColumnDef<PriceListItemRow>[])
        : []),
    ],
    [canWrite, priceList.currency],
  );

  const defaultFormValues: UpsertPriceListItemInput = editTarget
    ? {
        id: editTarget.id,
        priceListId: priceList.id,
        materialId: editTarget.materialId,
        posPointId: editTarget.posPointId ?? undefined,
        unitPrice: editTarget.unitPrice / 100,
        minQty: editTarget.minQty,
      }
    : {
        priceListId: priceList.id,
        materialId: "",
        unitPrice: 0,
        minQty: 1,
      };

  const status = resolveStatus(priceList);
  const statusMeta = STATUS_TONE[status];

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "Price Lists", href: "/management/pos/price-lists" as Route },
        { label: priceList.name, current: true },
      ]}
      header={{
        title: priceList.name,
        eyebrow: `${priceList.currency} · PRICE LIST`,
        description: `Effective ${formatDate(priceList.validFrom)}${priceList.validTo ? ` – ${formatDate(priceList.validTo)}` : " onward"}${priceList.isDefault ? " · Default" : ""}`,
        status: (
          <StatusBadge
            status={statusMeta.token}
            label={statusMeta.label}
            tone={statusMeta.tone}
            data-testid="price-list-detail-status"
          />
        ),
        "data-testid": "price-list-detail-header",
        ...(canWrite
          ? {
              primaryAction: (
                <Button onClick={openCreate} data-testid="price-list-item-add-btn">
                  <Plus aria-hidden className="size-4" />
                  Add line item
                </Button>
              ),
            }
          : {}),
      }}
      data-testid="price-list-detail-shell"
    >
      <FilterableDataTable<PriceListItemRow>
        toolbar={
          <FilterBar
            data-testid="price-list-detail-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search line items…"
                aria-label="Search line items"
                debounceMs={300}
                data-testid="price-list-detail-search"
              />
            }
            controls={
              <Select
                value={ppFilter.value ?? "all"}
                onValueChange={(next) => ppFilter.set(next === "all" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Terminal filter"
                  data-testid="price-list-detail-filter-pp"
                >
                  <SelectValue placeholder="All scopes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scopes</SelectItem>
                  <SelectItem value="all-terminals">Global rows only</SelectItem>
                  {posPoints.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
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
          mobileFieldPriority: MOBILE_COLUMNS,
          getRowId: (row) => row.id,
          "data-testid": "price-list-items-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No line items match your filters.", variant: "filtered-out" }
            : { title: "No line items yet.", variant: "first-use" }
        }
        data-testid="price-list-items-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit line item" : "Add line item"}
        hideFooter
        data-testid="price-list-item-sheet"
      >
        <PriceListItemForm
          key={editTarget?.id ?? "create"}
          defaultValues={defaultFormValues}
          materials={materials}
          posPoints={posPoints}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </DetailPageShell>
  );
}

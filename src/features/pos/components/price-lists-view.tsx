"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit } from "lucide-react";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { FieldPath } from "react-hook-form";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { DatePicker } from "@/components/ui/date-picker";
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

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { PriceListData, PriceListRow } from "@/features/pos/types/management";
import { upsertPriceList } from "@/features/pos/actions/upsert-price-list";
import {
  upsertPriceListSchema,
  type UpsertPriceListInput,
} from "@/features/pos/schemas/price-list";
import { parseIsoDateLocal } from "@/lib/date";

// ── Constants ───────────────────────────────────────────────────────────

const SEARCH_PARAM = "q";
const STATUS_PARAM = "status";

const MOBILE_COLUMNS = ["name", "statusBadge", "validFrom"] as const;

const STATUS_VALUES = ["active", "expired", "scheduled"] as const;
type StatusFilter = (typeof STATUS_VALUES)[number];
const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "Active",
  expired: "Expired",
  scheduled: "Scheduled",
};

type PriceListStatus = "currently_active" | "active" | "expired" | "scheduled";

// ── Status resolver ──────────────────────────────────────────────────────

function resolveStatus(row: PriceListRow): PriceListStatus {
  const today = format(new Date(), "yyyy-MM-dd");
  if (row.validFrom > today) return "scheduled";
  if (row.validTo && row.validTo < today) return "expired";
  // valid window
  if (row.isDefault) return "currently_active";
  return "active";
}

const STATUS_TONE: Record<PriceListStatus, { token: string; label: string; tone: "success" | "info" | "neutral" | "warning" }> = {
  currently_active: { token: "active", label: "Currently Active", tone: "success" },
  active: { token: "active", label: "Active", tone: "info" },
  expired: { token: "expired", label: "Expired", tone: "neutral" },
  scheduled: { token: "scheduled", label: "Scheduled", tone: "warning" },
};

// ── Formatters ──────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(parseIsoDateLocal(iso), "dd MMM yyyy");
}

function formatToYmd(d: Date | null): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

// ── Props ───────────────────────────────────────────────────────────────

type PriceListsViewProps = Readonly<{
  data: PriceListData;
  canWrite: boolean;
}>;

// ── Form ─────────────────────────────────────────────────────────────────

type PriceListFormProps = Readonly<{
  defaultValues: UpsertPriceListInput;
  onSuccess: () => void;
}>;

function PriceListForm({ defaultValues, onSuccess }: PriceListFormProps) {
  const form = useForm<UpsertPriceListInput>({
    resolver: zodResolver(upsertPriceListSchema),
    defaultValues,
  });

  async function handleSubmit(values: UpsertPriceListInput) {
    const res = await upsertPriceList(values);
    if (res.success) {
      toastSuccess(values.id ? "Price list updated." : "Price list created.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<UpsertPriceListInput>, { type: "server", message });
      }
    } else {
      toastError(res);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-5"
        data-testid="price-list-form"
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
                  placeholder="e.g. Summer Menu 2026"
                  data-testid="price-list-form-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={3}
                  placeholder="MYR"
                  className="uppercase"
                  data-testid="price-list-form-currency"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid from</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseIsoDateLocal(field.value) : null}
                  onChange={(d) => field.onChange(formatToYmd(d))}
                  placeholder="Pick start date"
                  data-testid="price-list-form-valid-from"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid to (optional)</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseIsoDateLocal(field.value) : null}
                  onChange={(d) => field.onChange(formatToYmd(d))}
                  placeholder="No end date"
                  clearable
                  data-testid="price-list-form-valid-to"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="price-list-is-default"
                    data-testid="price-list-form-is-default"
                  />
                </FormControl>
                <Label htmlFor="price-list-is-default">Use as default</Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton data-testid="price-list-form-submit">
          {defaultValues.id ? "Update price list" : "Create price list"}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── DatePicker proxy import (avoid bundle issues from named import) ──────

// ── Main view ────────────────────────────────────────────────────────────

export function PriceListsView({ data, canWrite }: PriceListsViewProps) {
  const router = useRouter();
  const search = useUrlString(SEARCH_PARAM);
  const statusFilter = useUrlString(STATUS_PARAM);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PriceListRow | null>(null);

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }
  function openEdit(row: PriceListRow) {
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
    let result = [...data.rows];
    const today = format(new Date(), "yyyy-MM-dd");

    if (statusFilter.value === "active") {
      result = result.filter(
        (r) => r.validFrom <= today && (!r.validTo || r.validTo >= today),
      );
    } else if (statusFilter.value === "expired") {
      result = result.filter((r) => r.validTo && r.validTo < today);
    } else if (statusFilter.value === "scheduled") {
      result = result.filter((r) => r.validFrom > today);
    }

    const q = search.value?.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.currency.toLowerCase().includes(q),
      );
    }
    return result;
  }, [data.rows, search.value, statusFilter.value]);

  const hasActiveFilters = Boolean(search.value || statusFilter.value);
  const resetAll = () => {
    search.set(null);
    statusFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (statusFilter.value && STATUS_VALUES.includes(statusFilter.value as StatusFilter)) {
    chips.push(
      <FilterChip
        key="status"
        name="Status"
        label={STATUS_LABELS[statusFilter.value as StatusFilter]}
        onRemove={() => statusFilter.set(null)}
        data-testid="price-lists-chip-status"
      />,
    );
  }

  // ── Columns ──────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<PriceListRow>[]>(
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
        id: "currency",
        accessorKey: "currency",
        header: "Currency",
      },
      {
        id: "validFrom",
        accessorKey: "validFrom",
        header: "Valid from",
        cell: ({ row }) => formatDate(row.original.validFrom),
      },
      {
        id: "validTo",
        accessorKey: "validTo",
        header: "Valid to",
        cell: ({ row }) => formatDate(row.original.validTo),
      },
      {
        id: "isDefault",
        accessorKey: "isDefault",
        header: "Default",
        cell: ({ row }) => (row.original.isDefault ? "Yes" : "—"),
      },
      {
        id: "statusBadge",
        header: "Status",
        cell: ({ row }) => {
          const status = resolveStatus(row.original);
          const meta = STATUS_TONE[status];
          return (
            <StatusBadge
              status={meta.token}
              label={meta.label}
              tone={meta.tone}
              data-testid={`price-list-status-${row.original.id}`}
            />
          );
        },
      },
      ...(canWrite
        ? ([
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: PriceListRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(row.original);
                  }}
                  aria-label={`Edit ${row.original.name}`}
                  data-testid={`price-list-edit-${row.original.id}`}
                >
                  <Edit className="size-4" aria-hidden />
                </Button>
              ),
            },
          ] satisfies ColumnDef<PriceListRow>[])
        : []),
    ],
    [canWrite],
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultFormValues: UpsertPriceListInput = editTarget
    ? {
        id: editTarget.id,
        name: editTarget.name,
        currency: editTarget.currency,
        validFrom: editTarget.validFrom,
        validTo: editTarget.validTo ?? "",
        isDefault: editTarget.isDefault,
      }
    : {
        name: "",
        currency: "MYR",
        validFrom: today,
        validTo: "",
        isDefault: false,
      };

  return (
    <div className="flex flex-col gap-6" data-testid="price-lists-view">
      <PageHeader
        title="Price Lists"
        description="Manage selling price lists with effectivity dates."
        data-testid="price-lists-header"
        primaryAction={
          canWrite ? (
            <Button onClick={openCreate} data-testid="price-list-create-btn">
              <Plus aria-hidden className="size-4" />
              New price list
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable<PriceListRow>
        toolbar={
          <FilterBar
            data-testid="price-lists-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search price lists…"
                aria-label="Search price lists"
                debounceMs={300}
                data-testid="price-lists-search"
              />
            }
            controls={
              <Select
                value={statusFilter.value ?? "all"}
                onValueChange={(next) => statusFilter.set(next === "all" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Status filter"
                  data-testid="price-lists-filter-status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
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
          onRowClick: (row) => router.push(`/management/pos/price-lists/${row.id}`),
          "data-testid": "price-lists-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No price lists match your filters.", variant: "filtered-out" }
            : { title: "No price lists yet.", variant: "first-use" }
        }
        data-testid="price-lists-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit price list" : "New price list"}
        hideFooter
        data-testid="price-list-sheet"
      >
        <PriceListForm
          key={editTarget?.id ?? "create"}
          defaultValues={defaultFormValues}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </div>
  );
}

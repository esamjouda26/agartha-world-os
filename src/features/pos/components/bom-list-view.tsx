"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, BookOpen, FileWarning, FileCheck2 } from "lucide-react";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { FieldPath } from "react-hook-form";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
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
import { SearchableSelect } from "@/components/ui/searchable-select";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { BomListData, BomRow } from "@/features/pos/types/management";
import { createBom } from "@/features/pos/actions/create-bom";
import {
  createBomSchema,
  type CreateBomInput,
  BOM_STATUSES,
  type BomStatus,
} from "@/features/pos/schemas/bom";
import { parseIsoDateLocal } from "@/lib/date";

// ── Constants ───────────────────────────────────────────────────────────

const SEARCH_PARAM = "q";
const STATUS_PARAM = "status";

const MOBILE_COLUMNS = ["parentMaterialName", "status", "version"] as const;

const STATUS_LABELS: Record<BomStatus, string> = {
  draft: "Draft",
  active: "Active",
  obsolete: "Obsolete",
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

type BomListViewProps = Readonly<{
  data: BomListData;
  canWrite: boolean;
}>;

// ── Form ─────────────────────────────────────────────────────────────────

type BomCreateFormProps = Readonly<{
  defaultValues: CreateBomInput;
  materials: ReadonlyArray<{ id: string; name: string }>;
  onSuccess: () => void;
}>;

function BomCreateForm({ defaultValues, materials, onSuccess }: BomCreateFormProps) {
  const form = useForm<CreateBomInput>({
    resolver: zodResolver(createBomSchema),
    defaultValues,
  });

  async function handleSubmit(values: CreateBomInput) {
    const res = await createBom(values);
    if (res.success) {
      toastSuccess("BOM draft created.");
      onSuccess();
    } else if (res.fields) {
      for (const [field, message] of Object.entries(res.fields)) {
        form.setError(field as FieldPath<CreateBomInput>, { type: "server", message });
      }
    } else if (res.error === "CONFLICT") {
      form.setError("version", {
        type: "server",
        message: "A BOM with this version already exists for this material.",
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
        data-testid="bom-create-form"
      >
        <FormField
          control={form.control}
          name="parentMaterialId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent material</FormLabel>
              <SearchableSelect
                options={materials.map((m) => ({ value: m.id, label: m.name }))}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? "")}
                placeholder="Search finished goods…"
                data-testid="bom-create-form-material"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Version</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                  data-testid="bom-create-form-version"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="effectiveFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective from</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseIsoDateLocal(field.value) : null}
                  onChange={(d) => field.onChange(formatToYmd(d))}
                  placeholder="Pick start date"
                  data-testid="bom-create-form-effective-from"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="effectiveTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective to (optional)</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseIsoDateLocal(field.value) : null}
                  onChange={(d) => field.onChange(formatToYmd(d))}
                  placeholder="No end date"
                  clearable
                  data-testid="bom-create-form-effective-to"
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
                    id="bom-create-is-default"
                    data-testid="bom-create-form-is-default"
                  />
                </FormControl>
                <Label htmlFor="bom-create-is-default">
                  Mark as default once activated
                </Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-foreground-muted text-xs">
          New BOMs start as <strong>draft</strong>. Components can be added on the
          detail page; use Activate to promote.
        </p>

        <FormSubmitButton data-testid="bom-create-form-submit">
          Create draft BOM
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

// ── Main view ────────────────────────────────────────────────────────────

export function BomListView({ data, canWrite }: BomListViewProps) {
  const router = useRouter();
  const search = useUrlString(SEARCH_PARAM);
  const statusFilter = useUrlString(STATUS_PARAM);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  function openCreate() {
    setSheetOpen(true);
  }
  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
  }
  function handleSuccess() {
    setSheetOpen(false);
    router.refresh();
  }

  const filtered = React.useMemo(() => {
    let result = [...data.rows];
    if (statusFilter.value && (BOM_STATUSES as readonly string[]).includes(statusFilter.value)) {
      result = result.filter((r) => r.status === statusFilter.value);
    }
    const q = search.value?.toLowerCase();
    if (q) {
      result = result.filter((r) => r.parentMaterialName.toLowerCase().includes(q));
    }
    return result;
  }, [data.rows, search.value, statusFilter.value]);

  const hasActiveFilters = Boolean(search.value || statusFilter.value);
  const resetAll = () => {
    search.set(null);
    statusFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (statusFilter.value && (BOM_STATUSES as readonly string[]).includes(statusFilter.value)) {
    chips.push(
      <FilterChip
        key="status"
        name="Status"
        label={STATUS_LABELS[statusFilter.value as BomStatus]}
        onRemove={() => statusFilter.set(null)}
        data-testid="bom-list-chip-status"
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<BomRow>[]>(
    () => [
      {
        id: "parentMaterialName",
        accessorKey: "parentMaterialName",
        header: "Parent material",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.parentMaterialName}</span>
        ),
      },
      {
        id: "version",
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => `v${row.original.version}`,
      },
      {
        id: "effectiveFrom",
        accessorKey: "effectiveFrom",
        header: "Effective from",
        cell: ({ row }) => formatDate(row.original.effectiveFrom),
      },
      {
        id: "effectiveTo",
        accessorKey: "effectiveTo",
        header: "Effective to",
        cell: ({ row }) => formatDate(row.original.effectiveTo),
      },
      {
        id: "isDefault",
        accessorKey: "isDefault",
        header: "Default",
        cell: ({ row }) => (row.original.isDefault ? "Yes" : "—"),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            data-testid={`bom-status-${row.original.id}`}
          />
        ),
      },
    ],
    [],
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultFormValues: CreateBomInput = {
    parentMaterialId: "",
    version: 1,
    effectiveFrom: today,
    effectiveTo: "",
    isDefault: false,
  };

  return (
    <div className="flex flex-col gap-6" data-testid="bom-list-view">
      <PageHeader
        title="Bill of Materials"
        description="Define recipes — how finished goods are assembled from components."
        data-testid="bom-list-header"
        primaryAction={
          canWrite ? (
            <Button onClick={openCreate} data-testid="bom-create-btn">
              <Plus aria-hidden className="size-4" />
              New BOM
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="bom-list-kpis">
        <KpiCard
          label="Active BOMs"
          value={data.kpis.activeBoms}
          caption="in use"
          icon={<FileCheck2 aria-hidden className="size-4" />}
          data-testid="bom-kpi-active"
        />
        <KpiCard
          label="Drafts pending activation"
          value={data.kpis.draftBoms}
          caption="awaiting activation"
          icon={<BookOpen aria-hidden className="size-4" />}
          data-testid="bom-kpi-drafts"
        />
        <KpiCard
          label="Finished items without BOM"
          value={data.kpis.finishedWithoutBom}
          caption="no recipe defined"
          icon={<FileWarning aria-hidden className="size-4" />}
          data-testid="bom-kpi-without"
        />
      </KpiCardRow>

      <FilterableDataTable<BomRow>
        toolbar={
          <FilterBar
            data-testid="bom-list-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param={SEARCH_PARAM}
                placeholder="Search by parent material…"
                aria-label="Search BOMs"
                debounceMs={300}
                data-testid="bom-list-search"
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
                  data-testid="bom-list-filter-status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {BOM_STATUSES.map((s) => (
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
          onRowClick: (row) => router.push(`/management/pos/bom/${row.id}`),
          "data-testid": "bom-list-table",
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          hasActiveFilters
            ? { title: "No BOMs match your filters.", variant: "filtered-out" }
            : { title: "No BOMs defined yet.", variant: "first-use" }
        }
        data-testid="bom-list-filterable"
      />

      <FormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="New BOM"
        description="Create a draft recipe for a finished or semi-finished material."
        hideFooter
        data-testid="bom-create-sheet"
      >
        <BomCreateForm
          defaultValues={defaultFormValues}
          materials={data.materials}
          onSuccess={handleSuccess}
        />
      </FormSheet>
    </div>
  );
}

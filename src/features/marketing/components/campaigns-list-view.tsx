"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarRange, Coins, Megaphone, Plus, Tags, Ticket, Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { deleteCampaign } from "@/features/marketing/actions/delete-campaign";
import { upsertCampaign } from "@/features/marketing/actions/upsert-campaign";
import { CAMPAIGN_STATUS_OPTIONS, LIFECYCLE_LABEL } from "@/features/marketing/constants";
import {
  upsertCampaignSchema,
  type UpsertCampaignInput,
} from "@/features/marketing/schemas/upsert-campaign";
import type { CampaignListData, CampaignRow, LifecycleStatus } from "@/features/marketing/types";

const MYR = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("en-MY");

const DATE = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const STATUS_TONE: Record<LifecycleStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  completed: "info",
};

function isExpired(row: CampaignRow): boolean {
  if (row.status !== "active" && row.status !== "paused") return false;
  if (!row.endDate) return false;
  // end_date is a DATE — compare as YYYY-MM-DD against today.
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return row.endDate < todayIso;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return DATE.format(new Date(`${iso}T00:00:00`));
}

type Props = Readonly<{
  data: CampaignListData;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>;

export function CampaignsListView({ data, canCreate, canUpdate, canDelete }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("active").withOptions({
      clearOnDefault: true,
      shallow: true,
      history: "replace",
    }),
  );

  const searchFilter = useUrlString("q");

  const filteredRows = React.useMemo(() => {
    let rows = [...data.rows];
    const sf = (statusFilter ?? "active") as LifecycleStatus;
    rows = rows.filter((r) => r.status === sf);

    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [data.rows, statusFilter, searchFilter.value]);

  const hasActiveFilters = Boolean(searchFilter.value);
  const resetAll = (): void => {
    searchFilter.set(null);
  };

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CampaignRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CampaignRow | null>(null);

  const openCreate = (): void => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (row: CampaignRow): void => {
    setEditing(row);
    setSheetOpen(true);
  };

  const columns = React.useMemo<ColumnDef<CampaignRow, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            {row.original.description ? (
              <span className="text-foreground-muted line-clamp-1 text-xs">
                {row.original.description}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const expired = isExpired(row.original);
          const status: LifecycleStatus = expired ? "completed" : row.original.status;
          return (
            <StatusBadge
              status={status}
              tone={STATUS_TONE[status]}
              label={LIFECYCLE_LABEL[status]}
              data-testid={`marketing-campaigns-row-status-${row.original.id}`}
            />
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "budget",
        header: "Budget",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.budget !== null ? MYR.format(row.original.budget) : "—"}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "promoCount",
        header: "Promos",
        cell: ({ row }) => (
          <span className="tabular-nums">{NUM.format(row.original.promoCount)}</span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "startDate",
        header: "Starts",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDate(row.original.startDate)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "endDate",
        header: "Ends",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{formatDate(row.original.endDate)}</span>
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
          <div className="flex items-center justify-end gap-1">
            {canUpdate ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(row.original);
                }}
                aria-label={`Edit ${row.original.name}`}
                data-testid={`marketing-campaigns-row-edit-${row.original.id}`}
              >
                <Pencil aria-hidden className="size-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(row.original);
                }}
                aria-label={`Delete ${row.original.name}`}
                data-testid={`marketing-campaigns-row-delete-${row.original.id}`}
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
    [canUpdate, canDelete],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="marketing-campaigns-list">
      <PageHeader
        title="Campaigns"
        description="Marketing campaigns and their linked promo codes."
        data-testid="marketing-campaigns-header"
        primaryAction={
          canCreate ? (
            <Button size="sm" onClick={openCreate} data-testid="marketing-campaigns-create-btn">
              <Plus aria-hidden className="size-4" /> New Campaign
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="marketing-campaigns-kpis">
        <KpiCard
          label="Active campaigns"
          value={NUM.format(data.kpis.activeCount)}
          icon={<Megaphone aria-hidden className="size-4" />}
          data-testid="marketing-campaigns-kpi-active"
        />
        <KpiCard
          label="Total promos"
          value={NUM.format(data.kpis.totalPromos)}
          icon={<Tags aria-hidden className="size-4" />}
          data-testid="marketing-campaigns-kpi-promos"
        />
        <KpiCard
          label="Total redemptions"
          value={NUM.format(data.kpis.totalRedemptions)}
          icon={<Ticket aria-hidden className="size-4" />}
          data-testid="marketing-campaigns-kpi-redemptions"
        />
        <KpiCard
          label="Total budget"
          value={MYR.format(data.kpis.totalBudget)}
          icon={<Coins aria-hidden className="size-4" />}
          data-testid="marketing-campaigns-kpi-budget"
        />
      </KpiCardRow>

      <StatusTabBar
        ariaLabel="Campaign status"
        paramKey="status"
        defaultValue="active"
        shallow
        data-testid="marketing-campaigns-tabs"
        tabs={[
          {
            value: "draft",
            label: "Draft",
            count: data.counts.draft,
            tone: "neutral",
          },
          {
            value: "active",
            label: "Active",
            count: data.counts.active,
            tone: "success",
          },
          {
            value: "paused",
            label: "Paused",
            count: data.counts.paused,
            tone: "warning",
          },
          {
            value: "completed",
            label: "Completed",
            count: data.counts.completed,
            tone: "info",
          },
        ]}
        onValueChange={(v) => void setStatusFilter(v)}
      />

      <FilterableDataTable<CampaignRow>
        toolbar={
          <FilterBar
            data-testid="marketing-campaigns-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search campaigns…"
                aria-label="Search campaigns"
                debounceMs={300}
                data-testid="marketing-campaigns-search"
              />
            }
            chips={null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: ["name", "status", "promoCount", "endDate"],
          getRowId: (row) => row.id,
          ...(canUpdate ? { onRowClick: (row) => openEdit(row) } : {}),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          (statusFilter ?? "active") === "active" && !hasActiveFilters && canCreate ? (
            <EmptyStateCta
              variant="first-use"
              title="No active campaigns"
              description="Launch a campaign to track redemptions across promo codes."
              icon={<Megaphone className="size-8" />}
              frame="none"
              ctaLabel="New Campaign"
              onClick={openCreate}
              data-testid="marketing-campaigns-empty-active"
            />
          ) : (
            {
              variant: "filtered-out" as const,
              title: hasActiveFilters ? "No campaigns match your search" : "Nothing in this tab",
              description: hasActiveFilters
                ? "Clear filters or try a different term."
                : "Records will appear here as they progress.",
              icon: <Megaphone className="size-8" />,
            }
          )
        }
        data-testid="marketing-campaigns-table"
      />

      <UpsertCampaignSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete campaign?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed. Linked promo codes are detached, not deleted.`
            : ""
        }
        intent="destructive"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deleteCampaign({
            campaignId: deleteTarget.id,
          });
          if (result.success) {
            toastSuccess("Campaign deleted.");
            setDeleteTarget(null);
            router.refresh();
          } else {
            toastError(result);
          }
        }}
        data-testid="marketing-campaigns-delete-dialog"
      />
    </div>
  );
}

// ── Upsert sheet ──────────────────────────────────────────────────────────

const SHEET_FORM_ID = "marketing-campaigns-upsert-form";

function UpsertCampaignSheet({
  open,
  onOpenChange,
  editing,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CampaignRow | null;
  onSaved: () => void;
}>) {
  const form = useForm<UpsertCampaignInput>({
    resolver: zodResolver(upsertCampaignSchema) as Resolver<UpsertCampaignInput>,
    defaultValues: {
      id: null,
      name: "",
      description: null,
      status: "draft",
      budget: null,
      startDate: null,
      endDate: null,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        id: editing?.id ?? null,
        name: editing?.name ?? "",
        description: editing?.description ?? null,
        status: editing?.status ?? "draft",
        budget: editing?.budget ?? null,
        startDate: editing?.startDate ?? null,
        endDate: editing?.endDate ?? null,
      });
    }
  }, [open, editing, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: UpsertCampaignInput): Promise<void> => {
    setPending(true);
    try {
      const result = await upsertCampaign(values);
      if (result.success) {
        toastSuccess(editing ? "Campaign updated." : "Campaign created.");
        onOpenChange(false);
        onSaved();
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
      title={editing ? "Edit Campaign" : "New Campaign"}
      description="Campaigns group promo codes for redemption tracking."
      formId={SHEET_FORM_ID}
      submitLabel={editing ? "Save" : "Create"}
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="marketing-campaigns-upsert-sheet"
    >
      <FormProvider {...form}>
        <form
          id={SHEET_FORM_ID}
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Basics">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Summer 2026 Family"
                      data-testid="marketing-campaigns-upsert-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      rows={3}
                      placeholder="Internal note about this campaign…"
                      data-testid="marketing-campaigns-upsert-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as LifecycleStatus)}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-10"
                        data-testid="marketing-campaigns-upsert-status"
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CAMPAIGN_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LIFECYCLE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Window & budget">
            <FormRow>
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : e.target.value)
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="marketing-campaigns-upsert-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : e.target.value)
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="marketing-campaigns-upsert-end"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (MYR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? null : parseFloat(v) || 0);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      placeholder="0"
                      data-testid="marketing-campaigns-upsert-budget"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-foreground-muted -mt-2 flex items-center gap-1 text-xs">
              <CalendarRange aria-hidden className="size-3" /> Set a window to auto-display the
              &ldquo;Completed&rdquo; badge after the end date.
            </p>
          </FormSection>
        </form>
      </FormProvider>
    </FormSheet>
  );
}

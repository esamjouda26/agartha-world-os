"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Tags, Ticket, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormRow } from "@/components/ui/form-row";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar, progressTone } from "@/components/ui/progress-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { deletePromoCode } from "@/features/marketing/actions/delete-promo-code";
import { upsertPromoCode } from "@/features/marketing/actions/upsert-promo-code";
import { CAMPAIGN_STATUS_OPTIONS, LIFECYCLE_LABEL } from "@/features/marketing/constants";
import {
  upsertPromoCodeSchema,
  type UpsertPromoCodeInput,
} from "@/features/marketing/schemas/upsert-promo-code";
import type {
  DiscountType,
  LifecycleStatus,
  PromoCodeRow,
  PromoListData,
  PromoTabKey,
} from "@/features/marketing/types";
import { ALL_DAYS_MASK, ISODOW_DAYS, classifyPromo } from "@/features/marketing/utils/promo-status";

const MYR = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("en-MY");
const DATETIME = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const STATUS_TONE: Record<LifecycleStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  completed: "info",
};

const TAB_TONE: Record<PromoTabKey, "neutral" | "success" | "info" | "warning"> = {
  draft: "neutral",
  active: "success",
  expired: "info",
  paused: "warning",
};

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: "Percentage",
  fixed: "Fixed amount",
};

function formatDiscount(row: PromoCodeRow): string {
  if (row.discountType === "percentage") {
    return `${NUM.format(row.discountValue)}% off`;
  }
  return `${MYR.format(row.discountValue)} off`;
}

function formatDateTime(iso: string): string {
  return DATETIME.format(new Date(iso));
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

type Props = Readonly<{
  data: PromoListData;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>;

export function PromosListView({ data, canCreate, canUpdate, canDelete }: Props) {
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
  const campaignFilter = useUrlString("campaign");
  const discountFilter = useUrlString("discount");

  // Stable "now" pinned at first render so tab counts, classification,
  // and visible badges don't drift mid-session as the wall clock ticks.
  const nowMs = React.useMemo(() => Date.now(), []);

  const filteredRows = React.useMemo(() => {
    let rows = [...data.rows];

    const sf = (statusFilter ?? "active") as PromoTabKey;
    rows = rows.filter((r) => classifyPromo(r, nowMs) === sf);

    if (campaignFilter.value) {
      rows = rows.filter((r) => r.campaignId === campaignFilter.value);
    }
    if (discountFilter.value) {
      rows = rows.filter((r) => r.discountType === discountFilter.value);
    }

    const q = searchFilter.value?.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          (r.campaignName?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [
    data.rows,
    statusFilter,
    campaignFilter.value,
    discountFilter.value,
    searchFilter.value,
    nowMs,
  ]);

  const hasActiveFilters = Boolean(
    searchFilter.value || campaignFilter.value || discountFilter.value,
  );

  const resetAll = (): void => {
    searchFilter.set(null);
    campaignFilter.set(null);
    discountFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (campaignFilter.value) {
    const name = data.campaigns.find((c) => c.id === campaignFilter.value)?.name;
    chips.push(
      <FilterChip
        key="campaign"
        name="Campaign"
        label={name ?? "—"}
        onRemove={() => campaignFilter.set(null)}
        data-testid="marketing-promos-chip-campaign"
      />,
    );
  }
  if (discountFilter.value) {
    chips.push(
      <FilterChip
        key="discount"
        name="Discount"
        label={DISCOUNT_TYPE_LABEL[discountFilter.value as DiscountType] ?? discountFilter.value}
        onRemove={() => discountFilter.set(null)}
        data-testid="marketing-promos-chip-discount"
      />,
    );
  }

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PromoCodeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PromoCodeRow | null>(null);

  const openCreate = (): void => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (row: PromoCodeRow): void => {
    setEditing(row);
    setSheetOpen(true);
  };

  const canDeleteRow = (row: PromoCodeRow): boolean => {
    if (!canDelete) return false;
    const expired = new Date(row.validTo).getTime() < nowMs;
    return row.status === "draft" || expired;
  };

  const columns = React.useMemo<ColumnDef<PromoCodeRow, unknown>[]>(
    () => [
      {
        id: "code",
        header: "Code",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold">{row.original.code}</span>
            {row.original.description ? (
              <span className="text-foreground-muted line-clamp-1 text-xs">
                {row.original.description}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "discount",
        header: "Discount",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{formatDiscount(row.original)}</span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "redemptions",
        header: "Redemptions",
        cell: ({ row }) => {
          const used = row.original.currentUses;
          const cap = row.original.maxUses;
          if (cap === null || cap === 0) {
            return (
              <span className="whitespace-nowrap tabular-nums">
                {NUM.format(used)} <span className="text-foreground-muted">/ ∞</span>
              </span>
            );
          }
          const pct = Math.min(100, (used / cap) * 100);
          return (
            <div className="flex w-32 flex-col gap-1">
              <span className="text-xs whitespace-nowrap tabular-nums">
                {NUM.format(used)} / {NUM.format(cap)}
              </span>
              <ProgressBar
                value={used}
                max={cap}
                tone={progressTone(pct)}
                size="xs"
                aria-label={`${Math.round(pct)} percent redeemed`}
                data-testid={`marketing-promos-row-progress-${row.original.id}`}
              />
            </div>
          );
        },
        meta: {
          headerClassName: "w-32 whitespace-nowrap",
          cellClassName: "w-32 whitespace-nowrap",
        },
      },
      {
        id: "campaign",
        header: "Campaign",
        cell: ({ row }) => row.original.campaignName ?? "—",
      },
      {
        id: "validWindow",
        header: "Valid window",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs tabular-nums">
            <span>{formatDateTime(row.original.validFrom)}</span>
            <span className="text-foreground-muted">→ {formatDateTime(row.original.validTo)}</span>
          </div>
        ),
        meta: {
          headerClassName: "whitespace-nowrap",
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const expired = new Date(row.original.validTo).getTime() < nowMs;
          const display: LifecycleStatus =
            expired && row.original.status !== "draft" ? "completed" : row.original.status;
          const label = display === "completed" && expired ? "Expired" : LIFECYCLE_LABEL[display];
          return (
            <StatusBadge
              status={display}
              tone={STATUS_TONE[display]}
              label={label}
              data-testid={`marketing-promos-row-status-${row.original.id}`}
            />
          );
        },
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
                aria-label={`Edit ${row.original.code}`}
                data-testid={`marketing-promos-row-edit-${row.original.id}`}
              >
                <Pencil aria-hidden className="size-4" />
              </Button>
            ) : null}
            {canDeleteRow(row.original) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(row.original);
                }}
                aria-label={`Delete ${row.original.code}`}
                data-testid={`marketing-promos-row-delete-${row.original.id}`}
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
    [canUpdate, canDelete, nowMs],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="marketing-promos-list">
      <PageHeader
        title="Promo Codes"
        description="Discount codes with tier and temporal validity for the booking flow."
        data-testid="marketing-promos-header"
        primaryAction={
          canCreate ? (
            <Button size="sm" onClick={openCreate} data-testid="marketing-promos-create-btn">
              <Plus aria-hidden className="size-4" /> New Promo Code
            </Button>
          ) : undefined
        }
      />

      <StatusTabBar
        ariaLabel="Promo status"
        paramKey="status"
        defaultValue="active"
        shallow
        data-testid="marketing-promos-tabs"
        tabs={[
          {
            value: "draft",
            label: "Draft",
            count: data.counts.draft,
            tone: TAB_TONE.draft,
          },
          {
            value: "active",
            label: "Active",
            count: data.counts.active,
            tone: TAB_TONE.active,
          },
          {
            value: "expired",
            label: "Expired",
            count: data.counts.expired,
            tone: TAB_TONE.expired,
          },
          {
            value: "paused",
            label: "Paused",
            count: data.counts.paused,
            tone: TAB_TONE.paused,
          },
        ]}
        onValueChange={(v) => void setStatusFilter(v)}
      />

      <FilterableDataTable<PromoCodeRow>
        toolbar={
          <FilterBar
            data-testid="marketing-promos-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search code, description, campaign…"
                aria-label="Search promo codes"
                debounceMs={300}
                data-testid="marketing-promos-search"
              />
            }
            controls={
              <>
                <Select
                  value={campaignFilter.value ?? "all"}
                  onValueChange={(v) => campaignFilter.set(v === "all" ? null : v)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    data-testid="marketing-promos-filter-campaign"
                    aria-label="Filter by campaign"
                  >
                    <SelectValue placeholder="All campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All campaigns</SelectItem>
                    {data.campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={discountFilter.value ?? "all"}
                  onValueChange={(v) => discountFilter.set(v === "all" ? null : v)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    data-testid="marketing-promos-filter-discount"
                    aria-label="Filter by discount type"
                  >
                    <SelectValue placeholder="All discounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All discounts</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: ["code", "discount", "status", "validWindow"],
          getRowId: (row) => row.id,
          ...(canUpdate ? { onRowClick: (row) => openEdit(row) } : {}),
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={
          (statusFilter ?? "active") === "active" && !hasActiveFilters && canCreate ? (
            <EmptyStateCta
              variant="first-use"
              title="No active promo codes"
              description="Create a code so guests can apply it at checkout."
              icon={<Ticket className="size-8" />}
              frame="none"
              ctaLabel="New Promo Code"
              onClick={openCreate}
              data-testid="marketing-promos-empty-active"
            />
          ) : (
            {
              variant: "filtered-out" as const,
              title: hasActiveFilters ? "No promos match your filters" : "Nothing in this tab",
              description: hasActiveFilters
                ? "Clear filters or try a different search."
                : "Records will appear here as they progress.",
              icon: <Tags className="size-8" />,
            }
          )
        }
        data-testid="marketing-promos-table"
      />

      <UpsertPromoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        campaigns={data.campaigns}
        tiers={data.tiers}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete promo code?"
        description={
          deleteTarget
            ? `"${deleteTarget.code}" will be removed permanently. Any historical bookings keep their amounts.`
            : ""
        }
        intent="destructive"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deletePromoCode({
            promoCodeId: deleteTarget.id,
          });
          if (result.success) {
            toastSuccess("Promo code deleted.");
            setDeleteTarget(null);
            router.refresh();
          } else {
            toastError(result);
          }
        }}
        data-testid="marketing-promos-delete-dialog"
      />
    </div>
  );
}

// ── Upsert sheet ──────────────────────────────────────────────────────────

const SHEET_FORM_ID = "marketing-promos-upsert-form";

function UpsertPromoSheet({
  open,
  onOpenChange,
  editing,
  campaigns,
  tiers,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PromoCodeRow | null;
  campaigns: PromoListData["campaigns"];
  tiers: PromoListData["tiers"];
  onSaved: () => void;
}>) {
  const form = useForm<UpsertPromoCodeInput>({
    resolver: zodResolver(upsertPromoCodeSchema) as Resolver<UpsertPromoCodeInput>,
    defaultValues: {
      id: null,
      code: "",
      description: null,
      discountType: "percentage",
      discountValue: 10,
      maxUses: 100,
      campaignId: null,
      status: "draft",
      validFrom: "",
      validTo: "",
      validDaysMask: null,
      validTimeStart: null,
      validTimeEnd: null,
      minGroupSize: 1,
      tierIds: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        id: editing?.id ?? null,
        code: editing?.code ?? "",
        description: editing?.description ?? null,
        discountType: editing?.discountType ?? "percentage",
        discountValue: editing?.discountValue ?? 10,
        maxUses: editing?.maxUses ?? 100,
        campaignId: editing?.campaignId ?? null,
        status: editing?.status ?? "draft",
        validFrom: editing?.validFrom ?? "",
        validTo: editing?.validTo ?? "",
        validDaysMask: editing?.validDaysMask ?? null,
        validTimeStart: editing?.validTimeStart ?? null,
        validTimeEnd: editing?.validTimeEnd ?? null,
        minGroupSize: editing?.minGroupSize ?? 1,
        tierIds: [...(editing?.tierIds ?? [])],
      });
    }
  }, [open, editing, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (values: UpsertPromoCodeInput): Promise<void> => {
    setPending(true);
    try {
      const result = await upsertPromoCode(values);
      if (result.success) {
        toastSuccess(editing ? "Promo updated." : "Promo created.");
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

  // Day-of-week toggles via bitmask. NULL mask = all days (no restriction).
  const validDaysMask = form.watch("validDaysMask");
  const restrictByDay = validDaysMask !== null;

  const toggleDay = (mask: number, on: boolean): void => {
    const current = form.getValues("validDaysMask") ?? 0;
    const next = on ? current | mask : current & ~mask;
    form.setValue("validDaysMask", next === 0 ? null : next, {
      shouldValidate: true,
    });
  };

  // Time toggle — NULL pair means "any time of day". Also defaults pair
  // when toggled on so the user gets sensible inputs.
  const validTimeStart = form.watch("validTimeStart");
  const restrictByTime = validTimeStart !== null;

  const tierOptions = React.useMemo(
    () => tiers.map((t) => ({ value: t.id, label: t.name })),
    [tiers],
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit Promo Code" : "New Promo Code"}
      description="Discount code with tier and time-of-day validity."
      formId={SHEET_FORM_ID}
      submitLabel={editing ? "Save" : "Create"}
      pending={pending}
      submitDisabled={pending}
      width="lg"
      data-testid="marketing-promos-upsert-sheet"
    >
      <FormProvider {...form}>
        <form
          id={SHEET_FORM_ID}
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Code">
            <FormRow>
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        placeholder="SUMMER25"
                        className="font-mono"
                        autoComplete="off"
                        data-testid="marketing-promos-upsert-code"
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
                          data-testid="marketing-promos-upsert-status"
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
            </FormRow>

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
                      rows={2}
                      placeholder="Internal note for marketing managers…"
                      data-testid="marketing-promos-upsert-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-10"
                        data-testid="marketing-promos-upsert-campaign"
                      >
                        <SelectValue placeholder="Unaffiliated" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Unaffiliated</SelectItem>
                      {campaigns.map((c) => (
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
          </FormSection>

          <FormSection title="Discount">
            <FormRow>
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as DiscountType)}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="h-10"
                          data-testid="marketing-promos-upsert-discount-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        placeholder="10"
                        data-testid="marketing-promos-upsert-discount-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max uses</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        inputMode="numeric"
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? null : parseInt(v, 10) || 0);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        placeholder="100"
                        data-testid="marketing-promos-upsert-max-uses"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={form.control}
              name="minGroupSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum group size *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      inputMode="numeric"
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      data-testid="marketing-promos-upsert-min-group"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Validity window">
            <FormRow>
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid from *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={isoToLocalInput(field.value)}
                        onChange={(e) => field.onChange(localInputToIso(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="marketing-promos-upsert-valid-from"
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
                    <FormLabel>Valid to *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={isoToLocalInput(field.value)}
                        onChange={(e) => field.onChange(localInputToIso(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="marketing-promos-upsert-valid-to"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
          </FormSection>

          <FormSection title="Day & time restrictions">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <FormLabel className="text-sm font-medium">Restrict by day of week</FormLabel>
                <p className="text-foreground-muted text-xs">Off = valid every day.</p>
              </div>
              <Switch
                checked={restrictByDay}
                onCheckedChange={(on) =>
                  form.setValue("validDaysMask", on ? ALL_DAYS_MASK : null, {
                    shouldValidate: true,
                  })
                }
                aria-label="Restrict by day of week"
                data-testid="marketing-promos-upsert-day-toggle"
              />
            </div>
            {restrictByDay ? (
              <div
                className="grid grid-cols-7 gap-1.5"
                data-testid="marketing-promos-upsert-day-grid"
              >
                {ISODOW_DAYS.map((d) => {
                  const checked = ((validDaysMask ?? 0) & d.mask) !== 0;
                  return (
                    <label
                      key={d.isodow}
                      className="border-border-subtle hover:bg-accent flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleDay(d.mask, Boolean(v))}
                        aria-label={d.long}
                        data-testid={`marketing-promos-upsert-day-${d.short.toLowerCase()}`}
                      />
                      <span>{d.short}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
            {validDaysMask !== null && validDaysMask < 1 ? (
              <p className="text-status-danger-foreground text-xs">Pick at least one day.</p>
            ) : null}

            <div className="border-border-subtle border-t pt-4" />

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <FormLabel className="text-sm font-medium">Restrict by time of day</FormLabel>
                <p className="text-foreground-muted text-xs">Off = valid 24 hours.</p>
              </div>
              <Switch
                checked={restrictByTime}
                onCheckedChange={(on) => {
                  form.setValue("validTimeStart", on ? "09:00" : null, {
                    shouldValidate: true,
                  });
                  form.setValue("validTimeEnd", on ? "18:00" : null, {
                    shouldValidate: true,
                  });
                }}
                aria-label="Restrict by time of day"
                data-testid="marketing-promos-upsert-time-toggle"
              />
            </div>
            {restrictByTime ? (
              <FormRow>
                <FormField
                  control={form.control}
                  name="validTimeStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time start</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="marketing-promos-upsert-time-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validTimeEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time end</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="marketing-promos-upsert-time-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
            ) : null}
          </FormSection>

          <FormSection title="Eligible tiers" description="Empty = valid for every tier.">
            <FormField
              control={form.control}
              name="tierIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiers</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={[...field.value]}
                      onChange={(v) => field.onChange([...v])}
                      options={tierOptions}
                      placeholder="All tiers"
                      searchPlaceholder="Search tiers…"
                      data-testid="marketing-promos-upsert-tiers"
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

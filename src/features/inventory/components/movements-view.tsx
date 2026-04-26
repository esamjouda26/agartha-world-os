"use client";

import * as React from "react";
import type { Route } from "next";
import { Link, useRouter } from "@/i18n/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  useForm,
  FormProvider,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  History,
  GitBranch,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Pencil,
  Plus,
  ExternalLink,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
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
import { FormRow } from "@/components/ui/form-row";
import { FormSection } from "@/components/ui/form-section";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { CursorPagination } from "@/components/shared/cursor-pagination";
import { FormSheet } from "@/components/shared/form-sheet";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  MovementDirection,
  MovementsLedgerData,
  MovementsLedgerRow,
  MovementTypeRow,
  MovementTypesCatalogData,
  MovementsTabFilter,
} from "@/features/inventory/types";
import {
  MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE,
  MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS,
} from "@/features/inventory/constants";
import {
  upsertMovementTypeSchema,
  type UpsertMovementTypeInput,
} from "@/features/inventory/schemas/upsert-movement-type";
import { upsertMovementType } from "@/features/inventory/actions/upsert-movement-type";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });
const SIGNED_QTY = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const CURRENCY = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 2,
});

const DIRECTION_LABEL: Record<MovementDirection, string> = {
  in: "In",
  out: "Out",
  transfer: "Transfer",
  neutral: "Neutral",
};
const DIRECTION_TONE: Record<
  MovementDirection,
  "success" | "warning" | "info" | "neutral"
> = {
  in: "success",
  out: "warning",
  transfer: "info",
  neutral: "neutral",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

type Props = Readonly<{
  ledger: MovementsLedgerData;
  catalog: MovementTypesCatalogData;
  /** True when user has `inventory:c` (movement-type create). */
  canCreateType: boolean;
  /** True when user has `inventory:u` (movement-type update). */
  canUpdateType: boolean;
}>;

export function MovementsView({
  ledger,
  catalog,
  canCreateType,
  canUpdateType,
}: Props) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault("ledger").withOptions({
      clearOnDefault: true,
      shallow: false,
      history: "replace",
    }),
  );
  const activeTab = (tab ?? "ledger") as MovementsTabFilter;

  return (
    <div className="flex flex-col gap-6" data-testid="inventory-movements-view">
      <PageHeader
        title="Goods Movement Ledger"
        description="Read-only ledger of every stock movement and the movement-type reference catalog."
        data-testid="inventory-movements-header"
      />

      <StatusTabBar
        ariaLabel="Movements view"
        paramKey="tab"
        defaultValue="ledger"
        shallow={false}
        data-testid="inventory-movements-tabs"
        tabs={[
          {
            value: "ledger",
            label: "Ledger",
            tone: "info",
          },
          {
            value: "types",
            label: "Movement Types",
            count: catalog.rows.length,
            tone: "neutral",
          },
        ]}
        onValueChange={(v) => void setTab(v)}
      />

      {activeTab === "ledger" ? (
        <LedgerTab ledger={ledger} />
      ) : (
        <MovementTypesTab
          catalog={catalog}
          canCreate={canCreateType}
          canUpdate={canUpdateType}
        />
      )}
    </div>
  );
}

// ── Ledger tab ────────────────────────────────────────────────────────

function LedgerTab({ ledger }: Readonly<{ ledger: MovementsLedgerData }>) {
  const movementTypeFilter = useUrlString("movementType");
  const materialFilter = useUrlString("material");
  const locationFilter = useUrlString("location");
  const fromFilter = useUrlString("from");
  const toFilter = useUrlString("to");

  const hasActiveFilters = Boolean(
    movementTypeFilter.value ||
      materialFilter.value ||
      locationFilter.value ||
      fromFilter.value ||
      toFilter.value,
  );

  const resetAll = (): void => {
    movementTypeFilter.set(null);
    materialFilter.set(null);
    locationFilter.set(null);
    fromFilter.set(null);
    toFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (movementTypeFilter.value) {
    const mt = ledger.movementTypes.find(
      (m) => m.id === movementTypeFilter.value,
    );
    chips.push(
      <FilterChip
        key="movementType"
        name="Movement type"
        label={mt ? `${mt.code} · ${mt.name}` : movementTypeFilter.value}
        onRemove={() => movementTypeFilter.set(null)}
        data-testid="inventory-movements-chip-mt"
      />,
    );
  }
  if (materialFilter.value) {
    const m = ledger.materials.find((x) => x.id === materialFilter.value);
    chips.push(
      <FilterChip
        key="material"
        name="Material"
        label={m?.name ?? materialFilter.value}
        onRemove={() => materialFilter.set(null)}
        data-testid="inventory-movements-chip-material"
      />,
    );
  }
  if (locationFilter.value) {
    const l = ledger.locations.find((x) => x.id === locationFilter.value);
    chips.push(
      <FilterChip
        key="location"
        name="Location"
        label={l?.name ?? locationFilter.value}
        onRemove={() => locationFilter.set(null)}
        data-testid="inventory-movements-chip-location"
      />,
    );
  }
  if (fromFilter.value || toFilter.value) {
    const label =
      fromFilter.value && toFilter.value
        ? `${fromFilter.value} → ${toFilter.value}`
        : fromFilter.value
          ? `After ${fromFilter.value}`
          : `Before ${toFilter.value}`;
    chips.push(
      <FilterChip
        key="date"
        name="Document date"
        label={label}
        onRemove={() => {
          fromFilter.set(null);
          toFilter.set(null);
        }}
        data-testid="inventory-movements-chip-date"
      />,
    );
  }

  const columns = React.useMemo<
    ColumnDef<MovementsLedgerRow, unknown>[]
  >(
    () => [
      {
        id: "documentDate",
        header: "Date",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatTimestamp(row.original.documentDate)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "movementType",
        header: "Movement type",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground-muted font-mono text-xs">
              {row.original.movementTypeCode}
            </span>
            <StatusBadge
              status={row.original.direction}
              tone={DIRECTION_TONE[row.original.direction]}
              label={DIRECTION_LABEL[row.original.direction]}
              variant="outline"
              data-testid={`inventory-movements-row-direction-${row.original.rowId}`}
            />
            <span className="text-foreground">
              {row.original.movementTypeName}
            </span>
          </span>
        ),
      },
      {
        id: "material",
        header: "Material",
        cell: ({ row }) => row.original.materialName,
      },
      {
        id: "quantity",
        header: "Qty",
        cell: ({ row }) => {
          const v = row.original.quantity;
          const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : null;
          const tone =
            v > 0
              ? "text-status-success-foreground"
              : v < 0
                ? "text-status-warning-foreground"
                : "text-foreground";
          return (
            <span
              className={`inline-flex items-center gap-1 tabular-nums font-medium ${tone}`}
            >
              {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
              {SIGNED_QTY.format(v)}
              {row.original.unitAbbreviation ? (
                <span className="text-foreground-muted ml-1 font-normal">
                  {row.original.unitAbbreviation}
                </span>
              ) : null}
            </span>
          );
        },
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => row.original.locationName,
      },
      {
        id: "unitCost",
        header: "Unit cost",
        cell: ({ row }) => (
          <span className="text-foreground-muted tabular-nums">
            {CURRENCY.format(row.original.unitCost)}
          </span>
        ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "totalCost",
        header: "Total cost",
        cell: ({ row }) => (
          <span className="text-foreground tabular-nums">
            {CURRENCY.format(row.original.totalCost)}
          </span>
        ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => {
          const src = row.original.sourceDoc;
          if (!src) return <span className="text-foreground-muted">—</span>;
          if (!src.href) {
            return (
              <span className="text-foreground-muted whitespace-nowrap text-sm">
                {src.label}
              </span>
            );
          }
          return (
            <Link
              href={src.href as Route}
              className="text-foreground hover:text-brand-primary inline-flex items-center gap-1 whitespace-nowrap text-sm"
              data-testid={`inventory-movements-row-source-${row.original.rowId}`}
            >
              {src.label}
              <ExternalLink aria-hidden className="size-3" />
            </Link>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="inventory-movements-ledger">
      <KpiCardRow data-testid="inventory-movements-ledger-kpis">
        <KpiCard
          label="Total movements"
          value={QTY.format(ledger.kpis.totalCount)}
          caption={`${ledger.kpis.periodStart} → ${ledger.kpis.periodEnd}`}
          icon={<History aria-hidden className="size-4" />}
          data-testid="inventory-movements-kpi-total"
        />
        <KpiCard
          label="Inbound"
          value={QTY.format(ledger.kpis.inboundCount)}
          caption="receipts + reversals"
          icon={<TrendingUp aria-hidden className="size-4" />}
          data-testid="inventory-movements-kpi-in"
        />
        <KpiCard
          label="Outbound"
          value={QTY.format(ledger.kpis.outboundCount)}
          caption="issues + scrap"
          icon={<TrendingDown aria-hidden className="size-4" />}
          data-testid="inventory-movements-kpi-out"
        />
        <KpiCard
          label="Transfers"
          value={QTY.format(ledger.kpis.transferCount)}
          caption="between locations"
          icon={<ArrowLeftRight aria-hidden className="size-4" />}
          data-testid="inventory-movements-kpi-transfer"
        />
      </KpiCardRow>

      <FilterableDataTable<MovementsLedgerRow>
        toolbar={
          <FilterBar
            data-testid="inventory-movements-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            controls={
              <>
                <Select
                  value={movementTypeFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    movementTypeFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[12rem] sm:w-auto"
                    aria-label="Movement type"
                    data-testid="inventory-movements-filter-mt"
                  >
                    <SelectValue placeholder="Any movement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any type</SelectItem>
                    {ledger.movementTypes.map((mt) => (
                      <SelectItem key={mt.id} value={mt.id}>
                        {mt.code} · {mt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SearchableSelect
                  value={materialFilter.value}
                  onChange={(v) => materialFilter.set(v)}
                  options={ledger.materials.map((m) => ({
                    value: m.id,
                    label: m.sku ? `${m.name} (${m.sku})` : m.name,
                  }))}
                  placeholder="Any material"
                  searchPlaceholder="Search materials…"
                  className="h-10 min-w-[14rem] sm:w-auto"
                  data-testid="inventory-movements-filter-material"
                />
                <Select
                  value={locationFilter.value ?? "__all__"}
                  onValueChange={(next) =>
                    locationFilter.set(next === "__all__" ? null : next)
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Location"
                    data-testid="inventory-movements-filter-location"
                  >
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any location</SelectItem>
                    {ledger.locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <UrlDateRangePicker
                  fromParam="from"
                  toParam="to"
                  className="min-w-[16rem] sm:w-auto"
                  data-testid="inventory-movements-filter-date"
                />
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: ledger.rows,
          columns,
          mobileFieldPriority: [
            "documentDate",
            "movementType",
            "material",
            "quantity",
          ],
          getRowId: (row) => row.rowId,
        }}
        pagination={
          <CursorPagination
            nextCursorToken={ledger.nextCursor}
            pageSizeOptions={MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS}
            defaultPageSize={MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE}
            data-testid="inventory-movements-pagination"
          />
        }
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: hasActiveFilters
            ? "No movements match your filters"
            : "No goods movements recorded",
          description: hasActiveFilters
            ? "Clear filters or try a wider date range."
            : "Movements appear here as receiving / requisitions / sales / disposals settle.",
          icon: <History className="size-8" />,
        }}
        data-testid="inventory-movements-table"
      />
    </div>
  );
}

// ── Movement Types tab ────────────────────────────────────────────────

function MovementTypesTab({
  catalog,
  canCreate,
  canUpdate,
}: Readonly<{
  catalog: MovementTypesCatalogData;
  canCreate: boolean;
  canUpdate: boolean;
}>) {
  const [editing, setEditing] = React.useState<MovementTypeRow | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<MovementTypeRow, unknown>[]>(
    () => [
      {
        id: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="text-foreground font-mono text-sm">
            {row.original.code}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.name}</span>
        ),
      },
      {
        id: "direction",
        header: "Direction",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.direction}
            tone={DIRECTION_TONE[row.original.direction]}
            label={DIRECTION_LABEL[row.original.direction]}
            variant="outline"
            data-testid={`inventory-movement-types-row-direction-${row.original.id}`}
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) =>
          row.original.description ? (
            <span className="text-foreground-muted text-sm">
              {row.original.description}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "requiresSourceDoc",
        header: "Source doc?",
        cell: ({ row }) =>
          row.original.requiresSourceDoc ? "Yes" : "—",
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-center",
          cellClassName: "w-0 whitespace-nowrap text-center",
        },
      },
      {
        id: "requiresCostCenter",
        header: "Cost center?",
        cell: ({ row }) =>
          row.original.requiresCostCenter ? "Yes" : "—",
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-center",
          cellClassName: "w-0 whitespace-nowrap text-center",
        },
      },
      {
        id: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "active" : "inactive"}
            variant="dot"
            data-testid={`inventory-movement-types-row-active-${row.original.id}`}
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(row.original)}
              data-testid={`inventory-movement-types-row-edit-${row.original.id}`}
              aria-label="Edit movement type"
            >
              <Pencil aria-hidden className="size-4" />
            </Button>
          ) : null,
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [canUpdate],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="inventory-movement-types-tab">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-foreground-muted text-sm">
          Reference catalog of stock movement types. Used by every goods
          movement to determine direction, source-doc requirement, and
          accounting rules.
        </p>
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="inventory-movement-types-create-btn"
          >
            <Plus aria-hidden className="size-4" /> New type
          </Button>
        ) : null}
      </div>

      <FilterableDataTable<MovementTypeRow>
        table={{
          data: catalog.rows,
          columns,
          mobileFieldPriority: ["code", "name", "direction", "isActive"],
          getRowId: (row) => row.id,
        }}
        emptyState={{
          variant: "first-use" as const,
          title: "No movement types",
          description: "The seed migration ships 15 standard types.",
          icon: <GitBranch className="size-8" />,
        }}
        data-testid="inventory-movement-types-table"
      />

      <MovementTypeFormSheet
        open={createOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        editing={editing}
      />
    </div>
  );
}

// ── Movement Type form sheet ──────────────────────────────────────────

function MovementTypeFormSheet({
  open,
  onOpenChange,
  editing,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MovementTypeRow | null;
}>) {
  const form = useForm<UpsertMovementTypeInput>({
    resolver: zodResolver(
      upsertMovementTypeSchema,
    ) as Resolver<UpsertMovementTypeInput>,
    defaultValues: {
      id: null,
      code: "",
      name: "",
      description: null,
      direction: "in",
      requiresSourceDoc: false,
      requiresCostCenter: false,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              id: editing.id,
              code: editing.code,
              name: editing.name,
              description: editing.description,
              direction: editing.direction,
              requiresSourceDoc: editing.requiresSourceDoc,
              requiresCostCenter: editing.requiresCostCenter,
              isActive: editing.isActive,
            }
          : {
              id: null,
              code: "",
              name: "",
              description: null,
              direction: "in",
              requiresSourceDoc: false,
              requiresCostCenter: false,
              isActive: true,
            },
      );
    }
  }, [open, editing, form]);

  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (
    values: UpsertMovementTypeInput,
  ): Promise<void> => {
    setPending(true);
    try {
      const result = await upsertMovementType(values);
      if (result.success) {
        toastSuccess(
          editing ? "Movement type updated" : "Movement type created",
        );
        onOpenChange(false);
        router.refresh();
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
      title={editing ? "Edit movement type" : "New movement type"}
      description={
        editing
          ? "Update direction, source-doc requirement, or activate/retire the type."
          : "Define a new movement type. Code is unique."
      }
      formId="inventory-movement-types-form"
      submitLabel={editing ? "Save changes" : "Create"}
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="inventory-movement-types-sheet"
    >
      <FormProvider {...form}>
        <form
          id="inventory-movement-types-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Identity">
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
                        placeholder="e.g. 311"
                        data-testid="inventory-movement-types-field-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="inventory-movement-types-field-direction">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in">In</SelectItem>
                        <SelectItem value="out">Out</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Transfer Between Locations"
                      data-testid="inventory-movement-types-field-name"
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
                        field.onChange(
                          e.target.value === "" ? null : e.target.value,
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      rows={2}
                      placeholder="When to use this movement type"
                      data-testid="inventory-movement-types-field-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Behavior">
            <FormRow>
              <FormField
                control={form.control}
                name="requiresSourceDoc"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="inventory-movement-types-field-source-doc"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Requires source doc</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiresCostCenter"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="inventory-movement-types-field-cost-center"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Requires cost center</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="inventory-movement-types-field-active"
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
  );
}

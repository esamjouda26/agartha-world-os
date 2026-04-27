"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { Check, Clock, Users, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { UrlDateRangePicker, useUrlDateRange } from "@/components/shared/url-date-range-picker";
import type { DateRangeValue } from "@/components/ui/date-range-picker";

import type { IamLedgerData, IamRequestRow } from "@/features/iam/queries/get-iam-ledger";
import type { StaffAccountsData } from "@/features/iam/queries/get-staff-accounts";
import { StaffAccountsView } from "@/features/iam/components/staff-accounts-view";

// ── Constants ──────────────────────────────────────────────────────────

const IAM_STATUSES = ["pending_it", "approved", "rejected"] as const;
type IamStatus = (typeof IAM_STATUSES)[number];

const IAM_STATUS_LABELS: Record<IamStatus, string> = {
  pending_it: "Pending IT",
  approved: "Approved",
  rejected: "Rejected",
};

const IAM_TYPE_LABELS: Record<string, string> = {
  provisioning: "Provisioning",
  transfer: "Transfer",
  termination: "Termination",
  suspension: "Suspension",
  reactivation: "Reactivation",
};

const TYPE_TONE: Record<string, "info" | "accent" | "danger" | "warning" | "success" | "neutral"> =
  {
    provisioning: "info",
    transfer: "accent",
    termination: "danger",
    suspension: "warning",
    reactivation: "success",
  };

// ── Top-level tabs ────────────────────────────────────────────────────

const IAM_TABS = ["requests", "staff-accounts"] as const;
type IamTab = (typeof IAM_TABS)[number];

// ── Props ──────────────────────────────────────────────────────────────

type IamLedgerViewProps = Readonly<{
  data: IamLedgerData;
  staffAccounts: StaffAccountsData;
  canWrite: boolean;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function IamLedgerView({ data, staffAccounts }: IamLedgerViewProps) {
  const [tab] = useQueryState(
    "view",
    parseAsString.withDefault("requests").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const currentTab: IamTab = (IAM_TABS as readonly string[]).includes(tab)
    ? (tab as IamTab)
    : "requests";

  return (
    <div className="flex flex-col gap-6" data-testid="iam-ledger">
      <PageHeader
        title="IAM Requests"
        description="Review and process identity & access management requests."
        data-testid="iam-ledger-header"
      />

      <StatusTabBar
        tabs={[
          { value: "requests", label: "Requests", count: data.kpis.pendingCount },
          {
            value: "staff-accounts",
            label: "Staff Accounts",
            count: staffAccounts.accounts.length,
          },
        ]}
        paramKey="view"
        defaultValue="requests"
        ariaLabel="IAM sections"
        panelIdPrefix="iam-tab"
        data-testid="iam-tabs"
      />

      <div
        role="tabpanel"
        id={`iam-tab-${currentTab}`}
        aria-labelledby={`tab-tab-${currentTab}`}
        data-testid={`iam-panel-${currentTab}`}
      >
        {currentTab === "requests" ? <RequestsPanel data={data} /> : null}
        {currentTab === "staff-accounts" ? <StaffAccountsView data={staffAccounts} /> : null}
      </div>
    </div>
  );
}

// ── Requests Panel (original ledger content) ──────────────────────────

function RequestsPanel({ data }: Readonly<{ data: IamLedgerData }>) {
  const router = useRouter();
  const statusFilter = useUrlString("status");
  const typeFilter = useUrlString("type");

  // Date range
  const { range: urlRange } = useUrlDateRange();
  const defaultRange = React.useMemo(computeDefaultRange, []);
  const isDefaultRange =
    urlRange === null ||
    (urlRange.from.getTime() === defaultRange.from.getTime() &&
      urlRange.to.getTime() === defaultRange.to.getTime());

  // Filter data based on URL state
  const filteredRequests = React.useMemo(() => {
    let result = [...data.requests];

    // Status filter
    const activeStatus = statusFilter.value;
    if (activeStatus && IAM_STATUSES.includes(activeStatus as IamStatus)) {
      result = result.filter((r) => r.status === activeStatus);
    }

    // Type filter
    if (typeFilter.value) {
      result = result.filter((r) => r.requestType === typeFilter.value);
    }

    // Date range filter
    const range = urlRange ?? defaultRange;
    const fromTs = range.from.getTime();
    const toTs = range.to.getTime() + 86_400_000; // end of day
    result = result.filter((r) => {
      const ts = new Date(r.createdAt).getTime();
      return ts >= fromTs && ts < toTs;
    });

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [data.requests, statusFilter.value, typeFilter.value, urlRange, defaultRange]);

  const hasActiveFilters = Boolean(statusFilter.value || typeFilter.value || !isDefaultRange);

  const resetAll = (): void => {
    statusFilter.set(null);
    typeFilter.set(null);
  };

  // ── Filter chips ──────────────────────────────────────────────────
  const chips: React.ReactNode[] = [];
  if (!isDefaultRange && urlRange) {
    chips.push(
      <FilterChip
        key="date"
        name="Date"
        label={formatRangeLabel(urlRange)}
        data-testid="iam-filter-chip-date"
      />,
    );
  }
  if (statusFilter.value) {
    chips.push(
      <FilterChip
        key="status"
        name="Status"
        label={IAM_STATUS_LABELS[statusFilter.value as IamStatus] ?? statusFilter.value}
        onRemove={() => statusFilter.set(null)}
        data-testid="iam-filter-chip-status"
      />,
    );
  }
  if (typeFilter.value) {
    chips.push(
      <FilterChip
        key="type"
        name="Type"
        label={IAM_TYPE_LABELS[typeFilter.value] ?? typeFilter.value}
        onRemove={() => typeFilter.set(null)}
        data-testid="iam-filter-chip-type"
      />,
    );
  }

  // ── Columns ────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<IamRequestRow, unknown>[]>(
    () => [
      {
        id: "type",
        accessorKey: "requestType",
        header: "Type",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.requestType}
            label={IAM_TYPE_LABELS[row.original.requestType] ?? row.original.requestType}
            tone={TYPE_TONE[row.original.requestType] ?? "neutral"}
            data-testid={`iam-row-type-${row.original.id}`}
          />
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "staffName",
        accessorKey: "staffName",
        header: "Staff Name",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.staffName}</span>
        ),
      },
      {
        id: "targetRole",
        accessorKey: "targetRoleName",
        header: "Target Role",
        cell: ({ row }) => row.original.targetRoleName ?? "—",
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            data-testid={`iam-row-status-${row.original.id}`}
          />
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "submitted",
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm tabular-nums">
            {format(parseISO(row.original.createdAt), "MMM d, yyyy · HH:mm")}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [],
  );

  return (
    <FilterableDataTable<IamRequestRow>
      kpis={
        <KpiCardRow data-testid="iam-kpis">
          <KpiCard
            label="Pending"
            value={data.kpis.pendingCount}
            caption="awaiting IT"
            icon={<Clock aria-hidden className="size-4" />}
            {...(data.kpis.pendingCount > 0
              ? {
                  trend: {
                    direction: "up" as const,
                    label: `${data.kpis.pendingCount} in queue`,
                    goodWhen: "down" as const,
                  },
                }
              : {})}
            data-testid="iam-kpi-pending"
          />
          <KpiCard
            label="Approved Today"
            value={data.kpis.approvedTodayCount}
            caption="processed"
            icon={<Check aria-hidden className="size-4" />}
            data-testid="iam-kpi-approved"
          />
          <KpiCard
            label="Avg Wait"
            value={data.kpis.avgWaitMs != null ? formatDurationMs(data.kpis.avgWaitMs) : "—"}
            caption="pending requests"
            icon={<Users aria-hidden className="size-4" />}
            data-testid="iam-kpi-wait"
          />
        </KpiCardRow>
      }
      toolbar={
        <FilterBar
          data-testid="iam-filters"
          hasActiveFilters={hasActiveFilters}
          onClearAll={resetAll}
          search={
            <UrlSearchInput
              param="q"
              placeholder="Search by name or role…"
              aria-label="Search"
              debounceMs={300}
              data-testid="iam-search"
            />
          }
          controls={
            <>
              <UrlDateRangePicker
                defaultRange={computeDefaultRange}
                clearable={false}
                aria-label="Date range"
                data-testid="iam-filter-date"
                className="min-w-[16rem] sm:w-auto"
              />
              <Select
                value={statusFilter.value ?? ""}
                onValueChange={(next) => statusFilter.set(next === "" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Status"
                  data-testid="iam-filter-status"
                >
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  {IAM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {IAM_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter.value ?? ""}
                onValueChange={(next) => typeFilter.set(next === "" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Request type"
                  data-testid="iam-filter-type"
                >
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IAM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
          chips={chips.length > 0 ? chips : null}
        />
      }
      table={{
        data: filteredRequests,
        columns,
        mobileFieldPriority: ["type", "staffName", "status", "submitted"],
        getRowId: (row) => row.id,
        onRowClick: (row) => router.push(`/admin/iam/${row.id}`),
      }}
      hasActiveFilters={hasActiveFilters}
      emptyState={{
        variant: "filtered-out" as const,
        title: "No IAM requests match your filters",
        description: "Widen the date range or clear a filter to see more requests.",
        icon: <ShieldCheck className="size-8" />,
      }}
      data-testid="iam-table"
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 30;

function computeDefaultRange(): DateRangeValue {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - (DEFAULT_WINDOW_DAYS - 1));
  return { from, to: today };
}

function formatRangeLabel(range: DateRangeValue): string {
  if (range.from.getTime() === range.to.getTime()) return format(range.from, "MMM d, yyyy");
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
}

function formatDurationMs(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60000))}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

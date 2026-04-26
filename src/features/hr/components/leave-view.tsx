"use client";

import * as React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { cancelLeaveRequestAction } from "@/features/hr/actions/cancel-leave-request";
import { createLeaveRequestAction } from "@/features/hr/actions/create-leave-request";
import { LEAVE_STATUS_VARIANT, PAST_STATUS_OPTIONS } from "@/features/hr/constants";
import type {
  MyLeaveData,
  LeaveBalanceRow,
  LeaveRequestRow,
  LeaveType,
} from "@/features/hr/queries/get-my-leave";

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

function buildYearOptions(): ReadonlyArray<number> {
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 4; y--) {
    years.push(y);
  }
  return years;
}

// ── Local: LeaveBalanceCards ──────────────────────────────────────────────────

type LeaveBalanceCardsProps = Readonly<{
  balances: ReadonlyArray<LeaveBalanceRow>;
}>;

function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  if (balances.length === 0) {
    return (
      <EmptyStateCta
        variant="first-use"
        title="No leave balances"
        description="Contact HR to set up your leave entitlements."
        data-testid="leave-balance-cards"
      />
    );
  }

  const rows = balances.map((b) => {
    const accrued = Number(b.accruedDays ?? 0);
    const carryForward = Number(b.carryForwardDays ?? 0);
    const adjustment = Number(b.adjustmentDays ?? 0);
    const used = Math.abs(Number(b.usedDays ?? 0));
    const forfeited = Math.abs(Number(b.forfeitureDays ?? 0));
    const remaining = Number(b.balance ?? 0);
    const entitled = accrued + carryForward + adjustment;
    return { ...b, entitled, used, forfeited, remaining, carryForward };
  });

  return (
    <div
      data-testid="leave-balance-cards"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
    >
      {rows.map((r) => (
        <div
          key={r.leaveTypeId ?? "unknown"}
          data-testid={`leave-balance-card-${r.leaveTypeId ?? "unknown"}`}
          className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-foreground text-sm font-semibold">{r.leaveTypeName ?? "Leave"}</p>
            {r.isPaid === false ? (
              <Badge variant="outline" className="text-[10px]">
                Unpaid
              </Badge>
            ) : null}
          </div>

          {/* 3 key stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 flex flex-col items-center gap-1 rounded-lg py-2.5">
              <span className="text-foreground text-xl leading-none font-bold tabular-nums">
                {r.entitled}
              </span>
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Entitled
              </span>
            </div>
            <div className="bg-muted/50 flex flex-col items-center gap-1 rounded-lg py-2.5">
              <span className="text-foreground text-xl leading-none font-bold tabular-nums">
                {r.used}
              </span>
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Used
              </span>
            </div>
            <div className="bg-brand-primary/10 flex flex-col items-center gap-1 rounded-lg py-2.5">
              <span className="text-brand-primary text-xl leading-none font-bold tabular-nums">
                {r.remaining}
              </span>
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Left
              </span>
            </div>
          </div>

          {/* Conditional notes */}
          {r.carryForward > 0 || r.forfeited > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
              {r.carryForward > 0 ? (
                <span className="text-muted-foreground">+{r.carryForward} carried over</span>
              ) : null}
              {r.forfeited > 0 ? (
                <span className="text-destructive">−{r.forfeited} forfeited</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ── Local: LeaveRequestForm ───────────────────────────────────────────────────

type FormState = {
  leaveTypeId: string;
  startDate: Date | null;
  endDate: Date | null;
  requestedDays: string;
  reason: string;
};

const INITIAL_FORM_STATE: FormState = {
  leaveTypeId: "",
  startDate: null,
  endDate: null,
  requestedDays: "",
  reason: "",
};

type LeaveRequestFormProps = Readonly<{
  leaveTypes: ReadonlyArray<LeaveType>;
  onSubmitted?: () => void;
}>;

function LeaveRequestForm({ leaveTypes, onSubmitted = () => undefined }: LeaveRequestFormProps) {
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isPending, startTransition] = React.useTransition();

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const requestedDaysNum = parseFloat(form.requestedDays);

    const errors: Record<string, string> = {};
    if (!form.leaveTypeId) errors["leaveTypeId"] = "Please select a leave type.";
    if (!form.startDate) errors["startDate"] = "Start date is required.";
    if (!form.endDate) errors["endDate"] = "End date is required.";
    if (!form.requestedDays || isNaN(requestedDaysNum) || requestedDaysNum <= 0) {
      errors["requestedDays"] = "Enter a valid number of days (min 0.5).";
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors["endDate"] = "End date must be on or after start date.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Format dates to YYYY-MM-DD for the server action
    const startDateStr = form.startDate ? format(form.startDate, "yyyy-MM-dd") : "";
    const endDateStr = form.endDate ? format(form.endDate, "yyyy-MM-dd") : "";

    startTransition(async () => {
      const result = await createLeaveRequestAction({
        leaveTypeId: form.leaveTypeId,
        startDate: startDateStr,
        endDate: endDateStr,
        requestedDays: requestedDaysNum,
        reason: form.reason.trim() || undefined,
      });

      if (!result.success) {
        if (result.fields) setFieldErrors(result.fields);
        toastError(result);
        return;
      }

      toastSuccess("Leave request submitted.", {
        description: "Your request is pending manager approval.",
      });
      setForm(INITIAL_FORM_STATE);
      setFieldErrors({});
      onSubmitted();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-testid="leave-request-form"
      className="flex flex-col gap-4"
    >
      {/* Leave type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leave-form-type-select">Leave Type</Label>
        <Select
          value={form.leaveTypeId}
          onValueChange={(value) => setField("leaveTypeId", value)}
          disabled={isPending}
        >
          <SelectTrigger
            id="leave-form-type-select"
            data-testid="leave-form-type-select"
            className="min-h-[44px] w-full"
            aria-invalid={fieldErrors["leaveTypeId"] ? true : undefined}
          >
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((lt) => (
              <SelectItem key={lt.id} value={lt.id}>
                {lt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors["leaveTypeId"] ? (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors["leaveTypeId"]}
          </p>
        ) : null}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-form-start-date">Start Date</Label>
          <DatePicker
            id="leave-form-start-date"
            value={form.startDate}
            onChange={(date) => setField("startDate", date)}
            disabled={isPending}
            placeholder="Pick start date"
            {...(fieldErrors["startDate"] ? { "aria-invalid": true } : {})}
            data-testid="leave-form-start-date"
            className="min-h-[44px]"
          />
          {fieldErrors["startDate"] ? (
            <p role="alert" className="text-destructive text-xs">
              {fieldErrors["startDate"]}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-form-end-date">End Date</Label>
          <DatePicker
            id="leave-form-end-date"
            value={form.endDate}
            onChange={(date) => setField("endDate", date)}
            disabled={isPending}
            placeholder="Pick end date"
            {...(form.startDate ? { minDate: form.startDate } : {})}
            {...(fieldErrors["endDate"] ? { "aria-invalid": true } : {})}
            data-testid="leave-form-end-date"
            className="min-h-[44px]"
          />
          {fieldErrors["endDate"] ? (
            <p role="alert" className="text-destructive text-xs">
              {fieldErrors["endDate"]}
            </p>
          ) : null}
        </div>
      </div>

      {/* Requested days */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leave-form-days">Days Requested</Label>
        <Input
          id="leave-form-days"
          type="number"
          min={0.5}
          step={0.5}
          value={form.requestedDays}
          onChange={(event) => setField("requestedDays", event.target.value)}
          disabled={isPending}
          placeholder="e.g. 1 or 0.5"
          aria-invalid={fieldErrors["requestedDays"] ? true : undefined}
          data-testid="leave-form-days"
          className="min-h-[44px]"
        />
        {fieldErrors["requestedDays"] ? (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors["requestedDays"]}
          </p>
        ) : null}
      </div>

      {/* Reason (optional) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leave-form-reason">
          Reason <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="leave-form-reason"
          value={form.reason}
          onChange={(event) => setField("reason", event.target.value)}
          disabled={isPending}
          placeholder="Add a note for your manager..."
          data-testid="leave-form-reason"
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          data-testid="leave-form-submit"
          className="min-h-[44px] w-full sm:w-auto"
        >
          {isPending ? "Submitting…" : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}

// ── Local: LeaveRequestsView (FilterableDataTable + StatusTabBar) ─────────────

type LeaveRequestsViewProps = Readonly<{
  requests: ReadonlyArray<LeaveRequestRow>;
  leaveTypes: ReadonlyArray<LeaveType>;
  filters: LeaveFilters;
}>;

const REQUEST_TABS = [
  { value: "pending", label: "Pending" },
  { value: "history", label: "History" },
] as const;

function LeaveRequestsView({ requests, leaveTypes, filters }: LeaveRequestsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const yearParam = filters.year;
  const leaveTypeParam = filters.leaveTypeId ?? "";
  const pastStatusParam = filters.pastStatus ?? "";

  function setFilter(key: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.push>[0]);
  }

  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const [isCancelling, startCancelTransition] = React.useTransition();

  const pendingRequests = React.useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );
  const historyRequests = React.useMemo(
    () => requests.filter((r) => r.status !== "pending"),
    [requests],
  );

  function handleCancelConfirm(): void {
    if (!cancelTargetId) return;
    const id = cancelTargetId;
    startCancelTransition(async () => {
      const result = await cancelLeaveRequestAction(id);
      setCancelTargetId(null);
      if (!result.success) {
        toastError(result);
        return;
      }
      toastSuccess("Leave request cancelled.");
    });
  }

  const yearOptions = buildYearOptions();

  // StatusTabBar tab definitions — include pending count badge
  const tabDefs = React.useMemo(
    () =>
      REQUEST_TABS.map((t) =>
        t.value === "pending"
          ? { ...t, count: pendingRequests.length }
          : { value: t.value, label: t.label },
      ),
    [pendingRequests.length],
  );

  // ── TanStack column defs (same pattern as audit) ────────────────────
  const baseColumns = React.useMemo<ColumnDef<LeaveRequestRow, unknown>[]>(
    () => [
      {
        id: "type",
        header: "Type",
        accessorKey: "leaveTypeName",
        cell: ({ row }) => (
          <span className="text-foreground text-sm font-medium">
            {row.original.leaveTypeName ?? "Leave"}
          </span>
        ),
      },
      {
        id: "dates",
        header: "Dates",
        cell: ({ row }) => {
          const s = format(parseISO(row.original.startDate), "d MMM yyyy");
          const e = format(parseISO(row.original.endDate), "d MMM yyyy");
          return (
            <span className="text-foreground-muted text-sm tabular-nums">
              {row.original.startDate === row.original.endDate ? s : `${s} – ${e}`}
            </span>
          );
        },
      },
      {
        id: "days",
        header: "Days",
        accessorKey: "requestedDays",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm tabular-nums">
            {row.original.requestedDays}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge
            variant={LEAVE_STATUS_VARIANT[row.original.status] ?? "outline"}
            className="capitalize"
          >
            {row.original.status}
          </Badge>
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "reason",
        header: "Reason",
        accessorKey: "reason",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-xs italic">{row.original.reason || "—"}</span>
        ),
      },
    ],
    [],
  );

  const pendingColumns = React.useMemo<ColumnDef<LeaveRequestRow, unknown>[]>(
    () => [
      ...baseColumns,
      {
        id: "action",
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setCancelTargetId(row.original.id);
            }}
            disabled={isCancelling}
            data-testid={`leave-cancel-${row.original.id}`}
          >
            <X aria-hidden className="size-3.5" /> Cancel
          </Button>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [baseColumns, isCancelling],
  );

  // ── History toolbar (filter slot) ───────────────────────────────────
  const historyToolbar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">Year</span>
        <Select value={yearParam} onValueChange={(v) => setFilter("year", v)}>
          <SelectTrigger className="min-h-[44px] w-full" data-testid="leave-filter-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">Leave Type</span>
        <Select
          value={leaveTypeParam || "_all"}
          onValueChange={(v) => setFilter("leave_type", v === "_all" ? "" : v)}
        >
          <SelectTrigger className="min-h-[44px] w-full" data-testid="leave-filter-type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {leaveTypes.map((lt) => (
              <SelectItem key={lt.id} value={lt.id}>
                {lt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">Status</span>
        <Select
          value={pastStatusParam || "_all"}
          onValueChange={(v) => setFilter("past_status", v === "_all" ? "" : v)}
        >
          <SelectTrigger className="min-h-[44px] w-full" data-testid="leave-filter-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {PAST_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // StatusTabBar uses nuqs — read current tab from the URL via the `tab` param
  const currentTab = searchParams.get("tab") ?? "pending";

  return (
    <div data-testid="leave-requests-view" className="flex flex-col gap-4">
      <StatusTabBar
        tabs={tabDefs}
        paramKey="tab"
        defaultValue="pending"
        ariaLabel="Leave request views"
        panelIdPrefix="leave-panel"
        data-testid="leave-tab-bar"
      />

      {currentTab === "pending" ? (
        <div role="tabpanel" id="leave-panel-pending" data-testid="leave-panel-pending">
          <FilterableDataTable<LeaveRequestRow>
            data-testid="leave-pending-table"
            table={{
              data: pendingRequests,
              columns: pendingColumns,
              mobileFieldPriority: ["type", "dates", "status", "action"],
              getRowId: (row) => row.id,
            }}
            emptyState={{
              variant: "first-use",
              title: "No pending requests",
              description:
                "Your submitted leave requests will appear here while they await approval.",
              "data-testid": "leave-pending-empty",
            }}
          />
        </div>
      ) : (
        <div role="tabpanel" id="leave-panel-history" data-testid="leave-panel-history">
          <FilterableDataTable<LeaveRequestRow>
            data-testid="leave-history-table"
            toolbar={historyToolbar}
            table={{
              data: historyRequests,
              columns: baseColumns,
              mobileFieldPriority: ["type", "dates", "status"],
              getRowId: (row) => row.id,
            }}
            hasActiveFilters={Boolean(leaveTypeParam || pastStatusParam)}
            emptyState={{
              variant: "filtered-out",
              title: "No leave history",
              description: "No requests match your current filters.",
              "data-testid": "leave-history-empty",
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTargetId(null);
        }}
        intent="warning"
        title="Cancel leave request?"
        description="This will withdraw your pending leave request. You can submit a new one at any time."
        confirmLabel="Cancel Request"
        cancelLabel="Keep"
        onConfirm={handleCancelConfirm}
        pending={isCancelling}
        data-testid="leave-cancel-dialog"
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeaveFilters = Readonly<{
  year: string;
  leaveTypeId: string;
  pastStatus: string;
}>;

// ── Main: LeaveView ───────────────────────────────────────────────────────────

type LeaveViewProps = Readonly<{
  initialData: MyLeaveData;
  /** Server-resolved filter values — kept in sync via RSC navigation. */
  filters: LeaveFilters;
}>;

export function LeaveView({ initialData, filters }: LeaveViewProps) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6" data-testid="leave-view">
      {/* Leave balances */}
      <SectionCard
        title="Leave Balances"
        description="Your current entitlements and usage."
        data-testid="leave-balances-section"
      >
        <LeaveBalanceCards balances={initialData.balances} />
      </SectionCard>

      {/* Submit new request */}
      <SectionCard
        title="New Request"
        description="Submit a leave request for manager approval."
        data-testid="leave-new-request-section"
      >
        <LeaveRequestForm leaveTypes={initialData.leaveTypes} />
      </SectionCard>

      {/* Leave requests history */}
      <SectionCard
        title="My Requests"
        description="Track your pending and past leave requests."
        data-testid="leave-requests-section"
      >
        <LeaveRequestsView
          requests={initialData.requests}
          leaveTypes={initialData.leaveTypes}
          filters={filters}
        />
      </SectionCard>
    </div>
  );
}

"use client";

import * as React from "react";
import type { Route } from "next";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { Clock, CheckCircle2, AlertTriangle, XCircle, CalendarOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { StandardPageShell } from "@/components/shared/standard-page-shell";
import { FormSheet } from "@/components/shared/form-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { CursorPagination } from "@/components/shared/cursor-pagination";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { CURSOR_RESET_PARAMS, useUrlString } from "@/components/shared/url-state-helpers";

import type {
  AttendanceLedgerRow,
  AttendanceLedgerPage,
} from "@/features/hr/types/attendance-ledger";
import { justifyExceptionAction } from "@/features/hr/actions/justify-exception";
import { voidPunchAction } from "@/features/hr/actions/void-punch";
import { convertExceptionToLeaveAction } from "@/features/hr/actions/convert-exception-to-leave";
import {
  encodeCursor,
  ATTENDANCE_LEDGER_PAGE_SIZES,
  ATTENDANCE_LEDGER_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/attendance-ledger-filters";

// ── Helpers ────────────────────────────────────────────────────────────

function formatHHMM(totalSeconds: number | null): string {
  if (totalSeconds == null || totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "present":
      return "Present";
    case "late":
      return "Late";
    case "absent":
      return "Absent";
    case "on_leave":
      return "On Leave";
    case "holiday":
      return "Holiday";
    case "scheduled":
      return "Scheduled";
    default:
      return status ?? "—";
  }
}

// ── Props ──────────────────────────────────────────────────────────────

type Props = Readonly<{
  page: AttendanceLedgerPage;
  canUpdate: boolean;
  leaveTypes: readonly { id: string; name: string; code: string }[];
}>;

export function AttendanceLedgerView({ page, canUpdate, leaveTypes }: Props) {
  // ── URL-driven filter state (server-side, all reset cursor) ─────────
  const statusFilter = useUrlString("status", { resetParams: CURSOR_RESET_PARAMS });
  const orgFilter = useUrlString("orgUnit", { resetParams: CURSOR_RESET_PARAMS });
  const shiftFilter = useUrlString("shiftType", { resetParams: CURSOR_RESET_PARAMS });

  const defaultDateRange = React.useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return { from: now, to: now };
  }, []);

  // Modal state
  const [justifyOpen, setJustifyOpen] = React.useState(false);
  const [voidOpen, setVoidOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<AttendanceLedgerRow | null>(null);
  const [pending, setPending] = React.useState(false);

  // Form refs for FormSheet formId pattern
  const justifyFormRef = React.useRef<HTMLFormElement>(null);
  const convertFormRef = React.useRef<HTMLFormElement>(null);

  // Active filter detection (for FilterBar clear-all affordance)
  const hasActiveFilters = !!(statusFilter.value || orgFilter.value || shiftFilter.value);

  const clearAll = React.useCallback(() => {
    statusFilter.set(null);
    orgFilter.set(null);
    shiftFilter.set(null);
  }, [statusFilter, orgFilter, shiftFilter]);

  // Compute status options from the page's data
  const statusOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of page.rows) if (r.derivedStatus) set.add(r.derivedStatus);
    return [...set].sort();
  }, [page.rows]);

  // Columns
  const cols = React.useMemo<ColumnDef<AttendanceLedgerRow, unknown>[]>(
    () => [
      { id: "staffName", accessorKey: "staffName", header: "Staff" },
      {
        id: "shiftDate",
        accessorKey: "shiftDate",
        header: "Date",
        cell: ({ row }) => {
          try {
            return format(parseISO(row.original.shiftDate), "dd MMM yyyy");
          } catch {
            return row.original.shiftDate;
          }
        },
      },
      { id: "shiftName", accessorKey: "shiftName", header: "Shift" },
      { id: "expectedStartTime", accessorKey: "expectedStartTime", header: "Start" },
      { id: "expectedEndTime", accessorKey: "expectedEndTime", header: "End" },
      {
        id: "firstIn",
        accessorKey: "firstIn",
        header: "Clock In",
        cell: ({ row }) => {
          if (!row.original.firstIn) return "—";
          try {
            return format(parseISO(row.original.firstIn), "HH:mm");
          } catch {
            return row.original.firstIn;
          }
        },
      },
      {
        id: "lastOut",
        accessorKey: "lastOut",
        header: "Clock Out",
        cell: ({ row }) => {
          if (!row.original.lastOut) return "—";
          try {
            return format(parseISO(row.original.lastOut), "HH:mm");
          } catch {
            return row.original.lastOut;
          }
        },
      },
      {
        id: "totalHours",
        header: "Total",
        cell: ({ row }) => formatHHMM(row.original.grossWorkedSeconds),
      },
      {
        id: "netHours",
        header: "Net",
        cell: ({ row }) => formatHHMM(row.original.netWorkedSeconds),
      },
      {
        id: "status",
        accessorKey: "derivedStatus",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.derivedStatus ?? "unknown"}
            label={statusLabel(row.original.derivedStatus)}
          />
        ),
      },
      {
        id: "issues",
        accessorKey: "exceptionTypes",
        header: "Issues",
        cell: ({ row }) => row.original.exceptionTypes ?? "—",
      },
      ...(canUpdate
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: AttendanceLedgerRow } }) => (
                <div className="flex gap-1">
                  {row.original.firstIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="hr-ledger-void-punch"
                      onClick={() => {
                        setSelectedRow(row.original);
                        setVoidOpen(true);
                      }}
                    >
                      Void
                    </Button>
                  )}
                  {row.original.hasUnjustified && (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="hr-ledger-approve"
                      onClick={() => {
                        setSelectedRow(row.original);
                        setJustifyOpen(true);
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  {(row.original.derivedStatus === "absent" ||
                    (!row.original.firstIn &&
                      row.original.derivedStatus !== "on_leave" &&
                      row.original.derivedStatus !== "holiday")) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="hr-ledger-convert"
                      onClick={() => {
                        setSelectedRow(row.original);
                        setConvertOpen(true);
                      }}
                    >
                      → Leave
                    </Button>
                  )}
                </div>
              ),
            } satisfies ColumnDef<AttendanceLedgerRow, unknown>,
          ]
        : []),
    ],
    [canUpdate],
  );

  // ── Cursor encoding ─────────────────────────────────────────────────
  const nextCursorToken = page.nextCursor
    ? encodeCursor(page.nextCursor.shiftDate, page.nextCursor.shiftScheduleId)
    : null;

  // Handlers
  const handleJustifySubmit = React.useCallback(async () => {
    if (!selectedRow || !justifyFormRef.current) return;
    const fd = new FormData(justifyFormRef.current);
    setPending(true);
    try {
      const result = await justifyExceptionAction({
        exceptionId: selectedRow.shiftScheduleId,
        reason: fd.get("reason") as string,
      });
      if (result.success) {
        toastSuccess("Exception approved");
        setJustifyOpen(false);
        setSelectedRow(null);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  }, [selectedRow]);

  const handleVoidConfirm = React.useCallback(async () => {
    if (!selectedRow) return;
    setPending(true);
    try {
      const result = await voidPunchAction({ punchId: selectedRow.shiftScheduleId });
      if (result.success) {
        toastSuccess("Punch voided");
        setVoidOpen(false);
        setSelectedRow(null);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  }, [selectedRow]);

  const handleConvertSubmit = React.useCallback(async () => {
    if (!selectedRow || !convertFormRef.current) return;
    const fd = new FormData(convertFormRef.current);
    setPending(true);
    try {
      const result = await convertExceptionToLeaveAction({
        exceptionId: selectedRow.shiftScheduleId,
        leaveTypeId: fd.get("leaveTypeId") as string,
        days: Number(fd.get("days")),
        note: (fd.get("note") as string) || "",
      });
      if (result.success) {
        toastSuccess("Converted to leave");
        setConvertOpen(false);
        setSelectedRow(null);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  }, [selectedRow]);

  return (
    <StandardPageShell
      breadcrumb={[
        { label: "HR", href: "/management/hr" as Route },
        { label: "Attendance Ledger", current: true as const },
      ]}
      header={{
        title: "Attendance Ledger",
        description: "Read-only attendance records with derived status and HR actions.",
      }}
    >
      <FilterableDataTable<AttendanceLedgerRow>
        kpis={
          <KpiCardRow data-testid="hr-ledger-kpis">
            <KpiCard
              label="Scheduled"
              value={page.kpis.scheduled}
              icon={<Clock className="size-4" />}
              data-testid="hr-ledger-kpi-scheduled"
            />
            <KpiCard
              label="Present"
              value={page.kpis.present}
              icon={<CheckCircle2 className="size-4" />}
              data-testid="hr-ledger-kpi-present"
            />
            <KpiCard
              label="Late"
              value={page.kpis.late}
              icon={<AlertTriangle className="size-4" />}
              data-testid="hr-ledger-kpi-late"
            />
            <KpiCard
              label="Absent"
              value={page.kpis.absent}
              icon={<XCircle className="size-4" />}
              data-testid="hr-ledger-kpi-absent"
            />
            <KpiCard
              label="On Leave"
              value={page.kpis.onLeave}
              icon={<CalendarOff className="size-4" />}
              data-testid="hr-ledger-kpi-leave"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="hr-ledger-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            search={
              <UrlSearchInput
                param="search"
                resetParams={CURSOR_RESET_PARAMS}
                placeholder="Search staff or shift…"
                debounceMs={350}
                data-testid="hr-ledger-search"
              />
            }
            controls={
              <>
                <UrlDateRangePicker
                  defaultRange={defaultDateRange}
                  resetParams={CURSOR_RESET_PARAMS}
                  clearable={false}
                  aria-label="Date range"
                  data-testid="hr-ledger-date-range"
                  className="min-w-[16rem] sm:w-auto"
                />
                <Select
                  value={statusFilter.value ?? "__none__"}
                  onValueChange={(v) => statusFilter.set(v === "__none__" ? null : v)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem]"
                    data-testid="hr-ledger-status-filter"
                  >
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled className="hidden">
                      Any status
                    </SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={orgFilter.value ?? "__none__"}
                  onValueChange={(v) => orgFilter.set(v === "__none__" ? null : v)}
                >
                  <SelectTrigger className="h-10 min-w-[10rem]" data-testid="hr-ledger-org-filter">
                    <SelectValue placeholder="Any unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled className="hidden">
                      Any unit
                    </SelectItem>
                    {page.orgUnits.map((ou) => (
                      <SelectItem key={ou.id} value={ou.name}>
                        {ou.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={shiftFilter.value ?? "__none__"}
                  onValueChange={(v) => shiftFilter.set(v === "__none__" ? null : v)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem]"
                    data-testid="hr-ledger-shift-filter"
                  >
                    <SelectValue placeholder="Any shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled className="hidden">
                      Any shift
                    </SelectItem>
                    {page.shiftTypes.map((st) => (
                      <SelectItem key={st.id} value={st.code}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
        }
        table={{
          columns: cols,
          data: page.rows,
          getRowId: (r) => r.shiftScheduleId,
          mobileFieldPriority: ["staffName", "shiftDate", "status"],
        }}
        pagination={
          <CursorPagination
            nextCursorToken={nextCursorToken}
            defaultPageSize={ATTENDANCE_LEDGER_DEFAULT_PAGE_SIZE}
            pageSizeOptions={ATTENDANCE_LEDGER_PAGE_SIZES}
            onAfterPaginate={() => {
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            data-testid="hr-ledger-pagination"
          />
        }
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out",
          title: "No attendance records match your filters",
          description: "Widen the date range or clear a filter to see records.",
          "data-testid": "hr-ledger-empty",
        }}
        data-testid="hr-ledger-table"
      />

      {/* Approve Exception */}
      <FormSheet
        open={justifyOpen}
        onOpenChange={setJustifyOpen}
        title="Approve Exception (Unilateral)"
        description={`Approve exception for ${selectedRow?.staffName ?? "staff"}.`}
        onSubmit={handleJustifySubmit}
        pending={pending}
        data-testid="hr-ledger-justify-sheet"
      >
        <form
          ref={justifyFormRef}
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <Label htmlFor="reason">HR Note (Justification)</Label>
            <Textarea
              id="reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Reason for approval…"
              data-testid="hr-ledger-justify-reason"
            />
          </div>
        </form>
      </FormSheet>

      {/* Void Punch — destructive ConfirmDialog */}
      <ConfirmDialog
        open={voidOpen}
        onOpenChange={(open) => {
          setVoidOpen(open);
          if (!open) setSelectedRow(null);
        }}
        title="Void Punch"
        description={`Void the punch record for ${selectedRow?.staffName ?? "staff"} on ${selectedRow?.shiftDate ?? ""}. This action is irreversible.`}
        intent="destructive"
        confirmLabel="Void Punch"
        onConfirm={handleVoidConfirm}
        pending={pending}
        data-testid="hr-ledger-void-dialog"
      />

      {/* Convert to Leave */}
      <FormSheet
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to Leave"
        description={`Convert absence for ${selectedRow?.staffName ?? "staff"} to approved leave.`}
        onSubmit={handleConvertSubmit}
        pending={pending}
        data-testid="hr-ledger-convert-sheet"
      >
        <form
          ref={convertFormRef}
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <Label htmlFor="leaveTypeId">Leave Type</Label>
            <Select name="leaveTypeId" required>
              <SelectTrigger data-testid="hr-ledger-convert-type">
                <SelectValue placeholder="Select leave type…" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="days">Days</Label>
            <Input
              id="days"
              name="days"
              type="number"
              step="0.5"
              min="0.5"
              max="30"
              defaultValue="1"
              required
              data-testid="hr-ledger-convert-days"
            />
          </div>
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              maxLength={500}
              placeholder="Optional note…"
              data-testid="hr-ledger-convert-note"
            />
          </div>
        </form>
      </FormSheet>
    </StandardPageShell>
  );
}

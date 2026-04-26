"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsString, useQueryState } from "nuqs";
import { Inbox, Clock, Paperclip } from "lucide-react";

import { CursorPagination } from "@/components/shared/cursor-pagination";
import {
  encodeQueueCursor,
  QUEUE_PAGE_SIZES,
  QUEUE_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/discrepancy-queue-filters";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { StandardPageShell } from "@/components/shared/standard-page-shell";
import { FormSheet } from "@/components/shared/form-sheet";
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

import type {
  DiscrepancyQueueRow,
  DiscrepancyQueueData,
} from "@/features/hr/types/discrepancy-queue";
import { justifyExceptionAction } from "@/features/hr/actions/justify-exception";
import { rejectClarificationAction } from "@/features/hr/actions/reject-clarification";
import { convertExceptionToLeaveAction } from "@/features/hr/actions/convert-exception-to-leave";

// ── Helpers ────────────────────────────────────────────────────────────

function exceptionTypeLabel(type: string): string {
  switch (type) {
    case "late_arrival":
      return "Late Arrival";
    case "early_departure":
      return "Early Departure";
    case "missing_clock_in":
      return "Missing Clock In";
    case "missing_clock_out":
      return "Missing Clock Out";
    case "absent":
      return "Absent";
    case "overtime":
      return "Overtime";
    default:
      return type;
  }
}

// ── Props ──────────────────────────────────────────────────────────────

type Props = Readonly<{ data: DiscrepancyQueueData; canUpdate: boolean }>;

export function DiscrepancyQueueView({ data, canUpdate }: Props) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );

  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<DiscrepancyQueueRow | null>(null);
  const [pending, setPending] = React.useState(false);

  const approveFormRef = React.useRef<HTMLFormElement>(null);
  const rejectFormRef = React.useRef<HTMLFormElement>(null);
  const convertFormRef = React.useRef<HTMLFormElement>(null);

  // Server-driven data (pagination + search handled server-side)
  const rows = data.rows;
  const nextCursorToken = data.nextCursor
    ? encodeQueueCursor(data.nextCursor.submittedAt, data.nextCursor.id)
    : null;

  // Supabase Realtime — new submissions appear live (spec §1721)
  const router = useRouter();
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("queue-exceptions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_exceptions",
          filter: "status=eq.pending_review",
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "attendance_exceptions",
          filter: "status=eq.pending_review",
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const cols = React.useMemo<ColumnDef<DiscrepancyQueueRow, unknown>[]>(
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
      { id: "shiftTime", accessorKey: "shiftTime", header: "Shift Time" },
      {
        id: "type",
        accessorKey: "type",
        header: "Exception",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.type}
            label={exceptionTypeLabel(row.original.type)}
            enum="exception_type"
          />
        ),
      },
      {
        id: "staffClarification",
        accessorKey: "staffClarification",
        header: "Staff Note",
        cell: ({ row }) => (
          <span
            className="text-muted-foreground max-w-[200px] truncate text-sm"
            title={row.original.staffClarification ?? ""}
          >
            {row.original.staffClarification ?? "—"}
          </span>
        ),
      },
      {
        id: "attachments",
        header: "Files",
        cell: ({ row }) =>
          row.original.attachmentCount > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
              <Paperclip className="size-3" /> {row.original.attachmentCount}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "punchRemark",
        accessorKey: "punchRemark",
        header: "Punch Note",
        cell: ({ row }) => (
          <span
            className="text-muted-foreground max-w-[150px] truncate text-sm"
            title={row.original.punchRemark ?? ""}
          >
            {row.original.punchRemark ?? "—"}
          </span>
        ),
      },
      {
        id: "submittedAt",
        accessorKey: "clarificationSubmittedAt",
        header: "Submitted",
        cell: ({ row }) => {
          if (!row.original.clarificationSubmittedAt) return "—";
          try {
            return formatDistanceToNow(parseISO(row.original.clarificationSubmittedAt), {
              addSuffix: true,
            });
          } catch {
            return row.original.clarificationSubmittedAt;
          }
        },
      },
      ...(canUpdate
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: DiscrepancyQueueRow } }) => (
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    data-testid="hr-queue-approve"
                    onClick={() => {
                      setSelectedRow(row.original);
                      setApproveOpen(true);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="hr-queue-reject"
                    onClick={() => {
                      setSelectedRow(row.original);
                      setRejectOpen(true);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="hr-queue-convert"
                    onClick={() => {
                      setSelectedRow(row.original);
                      setConvertOpen(true);
                    }}
                  >
                    → Leave
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<DiscrepancyQueueRow, unknown>,
          ]
        : []),
    ],
    [canUpdate],
  );

  const handleApprove = React.useCallback(async () => {
    if (!selectedRow || !approveFormRef.current) return;
    const fd = new FormData(approveFormRef.current);
    setPending(true);
    try {
      const result = await justifyExceptionAction({
        exceptionId: selectedRow.id,
        reason: fd.get("reason") as string,
      });
      if (result.success) {
        toastSuccess("Exception approved");
        setApproveOpen(false);
        setSelectedRow(null);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  }, [selectedRow]);

  const handleReject = React.useCallback(async () => {
    if (!selectedRow || !rejectFormRef.current) return;
    const fd = new FormData(rejectFormRef.current);
    setPending(true);
    try {
      const result = await rejectClarificationAction({
        exceptionId: selectedRow.id,
        reason: fd.get("reason") as string,
      });
      if (result.success) {
        toastSuccess("Clarification rejected");
        setRejectOpen(false);
        setSelectedRow(null);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  }, [selectedRow]);

  const handleConvert = React.useCallback(async () => {
    if (!selectedRow || !convertFormRef.current) return;
    const fd = new FormData(convertFormRef.current);
    setPending(true);
    try {
      const result = await convertExceptionToLeaveAction({
        exceptionId: selectedRow.id,
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
        { label: "Discrepancy Queue", current: true as const },
      ]}
      header={{
        title: "Discrepancy Queue",
        description:
          "HR action-required inbox — approve or reject staff clarification submissions.",
      }}
    >
      <FilterableDataTable
        kpis={
          <KpiCardRow data-testid="hr-queue-kpis">
            <KpiCard
              label="Awaiting Review"
              value={data.kpis.awaitingReview}
              icon={<Inbox className="size-4" />}
              data-testid="hr-queue-kpi-awaiting"
            />
            <KpiCard
              label="Oldest Submission"
              value={data.kpis.oldestHoursAgo !== null ? `${data.kpis.oldestHoursAgo}h ago` : "—"}
              icon={<Clock className="size-4" />}
              data-testid="hr-queue-kpi-sla"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            data-testid="hr-queue-filters"
            search={
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search staff or exception type…"
                data-testid="hr-queue-search"
              />
            }
          />
        }
        table={{
          columns: cols,
          data: rows as DiscrepancyQueueRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["staffName", "shiftDate", "type"],
        }}
        pagination={
          <CursorPagination
            nextCursorToken={nextCursorToken}
            defaultPageSize={QUEUE_DEFAULT_PAGE_SIZE}
            pageSizeOptions={QUEUE_PAGE_SIZES}
            data-testid="hr-queue-pagination"
          />
        }
        data-testid="hr-queue-table"
      />

      {/* Approve Modal */}
      <FormSheet
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Clarification"
        description={`Approve the clarification submitted by ${selectedRow?.staffName ?? "staff"}.`}
        onSubmit={handleApprove}
        pending={pending}
        data-testid="hr-queue-approve-sheet"
      >
        <form
          ref={approveFormRef}
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          {selectedRow?.staffClarification && (
            <div className="bg-muted rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Staff&apos;s Clarification
              </p>
              <p className="text-sm">{selectedRow.staffClarification}</p>
            </div>
          )}
          <div>
            <Label htmlFor="reason">HR Note</Label>
            <Textarea
              id="reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Justification note…"
              data-testid="hr-queue-approve-reason"
            />
          </div>
        </form>
      </FormSheet>

      {/* Reject Modal */}
      <FormSheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Clarification"
        description={`Reject clarification from ${selectedRow?.staffName ?? "staff"}. They may resubmit.`}
        onSubmit={handleReject}
        pending={pending}
        data-testid="hr-queue-reject-sheet"
      >
        <form
          ref={rejectFormRef}
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          {selectedRow?.staffClarification && (
            <div className="bg-muted rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Staff&apos;s Clarification
              </p>
              <p className="text-sm">{selectedRow.staffClarification}</p>
            </div>
          )}
          <div>
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Reason for rejection…"
              data-testid="hr-queue-reject-reason"
            />
          </div>
        </form>
      </FormSheet>

      {/* Convert to Leave */}
      <FormSheet
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to Leave"
        description={`Convert exception for ${selectedRow?.staffName ?? "staff"} to approved leave.`}
        onSubmit={handleConvert}
        pending={pending}
        data-testid="hr-queue-convert-sheet"
      >
        <form
          ref={convertFormRef}
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <Label htmlFor="leaveTypeId">Leave Type</Label>
            <Select name="leaveTypeId" required>
              <SelectTrigger data-testid="hr-queue-convert-type">
                <SelectValue placeholder="Select leave type…" />
              </SelectTrigger>
              <SelectContent>
                {data.leaveTypes.map((lt) => (
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
              data-testid="hr-queue-convert-days"
            />
          </div>
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              maxLength={500}
              placeholder="Optional note…"
              data-testid="hr-queue-convert-note"
            />
          </div>
        </form>
      </FormSheet>
    </StandardPageShell>
  );
}

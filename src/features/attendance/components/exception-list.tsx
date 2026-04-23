"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock4,
  FileText,
  MessageSquareText,
  Paperclip,
  StickyNote,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastInfo, toastSuccess } from "@/components/ui/toast-helpers";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { useUrlEnum, useUrlString } from "@/components/shared/url-state-helpers";
import { formatAtFacility, parseIsoDateLocal } from "@/lib/date";

import {
  CLARIFICATION_MAX_LEN,
  UNJUSTIFIED_BANNER_THRESHOLD,
} from "@/features/attendance/constants";
import { submitClarificationAction } from "@/features/attendance/actions/submit-clarification";
import { uploadClarificationAttachment } from "@/features/attendance/utils/upload-clarification-attachment";
import type { ExceptionRow, ExceptionType } from "@/features/attendance/types";

/**
 * Tab-2 "My Exceptions" surface.
 *
 * Composes the canonical `<FilterableDataTable>` with `renderSubComponent`
 * for inline expansion of the per-row clarification editor. The previous
 * Sheet-based detail UX (open a side drawer per row) has been replaced
 * with inline expansion to match the audit page pattern — diff lives
 * directly under its row, not in a separate surface.
 *
 * ADR-0007's four-state workflow is preserved verbatim inside the
 * inline detail body:
 *   unjustified     → "Request HR review" editor (text + attachments)
 *   pending_review  → read-only "Awaiting HR review" with submitted context
 *   justified       → read-only "Approved" + HR note
 *   rejected        → read-only rejection note + "Edit & resubmit" editor
 */

const MAX_ATTACHMENTS = 5;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (matches bucket cap)
const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

type Props = Readonly<{
  rows: ReadonlyArray<ExceptionRow>;
  /** Caller's staff_record_id — used as the first path segment when
   * uploading attachment blobs to the attendance-clarifications bucket. */
  staffRecordId: string;
}>;

const TYPE_LABEL: Record<ExceptionType, string> = {
  late_arrival: "Late arrival",
  early_departure: "Early departure",
  missing_clock_in: "Missing clock-in",
  missing_clock_out: "Missing clock-out",
  absent: "Absent",
};

const TYPE_VALUES = [
  "late_arrival",
  "early_departure",
  "missing_clock_in",
  "missing_clock_out",
  "absent",
] as const satisfies readonly ExceptionType[];

/**
 * View axis — collapses ADR-0007's four exception statuses into the
 * three buckets a staff member actually thinks in:
 *   - "action"   → unjustified + rejected (rows the user must clarify)
 *   - "pending"  → pending_review (HR is reviewing; nothing the user can do)
 *   - "approved" → justified (terminal — for the record)
 *
 * Absent param ⇒ show all (default landing).
 */
const VIEW_VALUES = ["action", "pending", "approved"] as const;
type ViewValue = (typeof VIEW_VALUES)[number];

const VIEW_LABEL: Record<ViewValue, string> = {
  action: "Needs your attention",
  pending: "Awaiting HR",
  approved: "Approved",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

/** Reset the page param when filter axes change so the user always
 *  lands on page 1 of the new narrowing (otherwise navigating from a
 *  3-page view to a 1-page view would leave them on an empty page). */
const FILTER_RESET_PARAMS = ["page"] as const;

export function ExceptionList({ rows, staffRecordId }: Props) {
  // Filters + pagination — all URL-bound via the sink helpers. Filter
  // changes auto-reset the page param so users always land on page 1
  // of the new narrowing.
  const view = useUrlEnum<ViewValue>("view", VIEW_VALUES, {
    resetParams: FILTER_RESET_PARAMS,
  });
  const type = useUrlEnum<ExceptionType>("type", TYPE_VALUES, {
    resetParams: FILTER_RESET_PARAMS,
  });
  const pageParam = useUrlString("page");
  const pageSizeParam = useUrlString("pageSize");
  const pageIndex = Math.max(0, (Number(pageParam.value) || 1) - 1);
  const pageSize = (() => {
    const parsed = Number(pageSizeParam.value);
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
  })();

  // Apply filters client-side. The full set is RSC-fetched and capped
  // by the staff member's lifetime exception count (typically <100 — no
  // need for server-side cursor pagination).
  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (view.value === "action") {
        if (row.status !== "unjustified" && row.status !== "rejected") return false;
      } else if (view.value === "pending") {
        if (row.status !== "pending_review") return false;
      } else if (view.value === "approved") {
        if (row.status !== "justified") return false;
      }
      if (type.value && row.type !== type.value) return false;
      return true;
    });
  }, [rows, view.value, type.value]);

  // Rows in the CURRENTLY-VISIBLE set (after filtering) that need the
  // user's action — either never-submitted (`unjustified`) or rejected
  // and awaiting resubmission. Counted from `filteredRows` rather than
  // `rows` so the actionable-count Alert banner reflects what the user
  // can actually see + tap right now. When a filter hides all
  // actionable rows (e.g., view = "Approved"), the banner disappears.
  const actionableCount = React.useMemo(
    () =>
      filteredRows.filter((row) => row.status === "unjustified" || row.status === "rejected")
        .length,
    [filteredRows],
  );

  // Slice for offset pagination. Clamp pageIndex to a valid range so a
  // stale `?page=99` doesn't render an empty page after filters narrow
  // the result set.
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visibleRows = React.useMemo(() => {
    const start = safePageIndex * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePageIndex, pageSize]);

  const handlePageChange = (next: number): void => {
    // 1-indexed in URL for human-friendliness; default page 1 = no param.
    pageParam.set(next === 0 ? null : String(next + 1));
  };

  const handlePageSizeChange = (next: number): void => {
    pageSizeParam.set(next === DEFAULT_PAGE_SIZE ? null : String(next));
    // Page-size change also resets to page 1 — old `pageIndex` may
    // overshoot the new page count.
    pageParam.set(null);
  };

  const hasActiveFilters = !!view.value || !!type.value;

  const chips: React.ReactNode[] = [];
  if (view.value) {
    chips.push(
      <FilterChip
        key="view"
        name="View"
        label={VIEW_LABEL[view.value]}
        onRemove={() => view.set(null)}
        data-testid="attendance-exceptions-chip-view"
      />,
    );
  }
  if (type.value) {
    chips.push(
      <FilterChip
        key="type"
        name="Type"
        label={TYPE_LABEL[type.value]}
        onRemove={() => type.set(null)}
        data-testid="attendance-exceptions-chip-type"
      />,
    );
  }

  const filtersToolbar = (
    <FilterBar
      data-testid="attendance-exceptions-filters"
      hasActiveFilters={hasActiveFilters}
      onClearAll={() => {
        view.set(null);
        type.set(null);
      }}
      controls={
        <>
          <Select
            value={view.value ?? "all"}
            onValueChange={(next) => view.set(next === "all" ? null : (next as ViewValue))}
          >
            <SelectTrigger
              className="h-10 min-w-[12rem] sm:w-auto"
              aria-label="View"
              data-testid="attendance-exceptions-view"
            >
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exceptions</SelectItem>
              {VIEW_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {VIEW_LABEL[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={type.value ?? "all"}
            onValueChange={(next) => type.set(next === "all" ? null : (next as ExceptionType))}
          >
            <SelectTrigger
              className="h-10 min-w-[12rem] sm:w-auto"
              aria-label="Type"
              data-testid="attendance-exceptions-type"
            >
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any type</SelectItem>
              {TYPE_VALUES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
      chips={chips.length > 0 ? chips : null}
    />
  );

  const paginationFooter = (
    <PaginationBar
      mode="offset"
      pageIndex={safePageIndex}
      pageCount={pageCount}
      pageSize={pageSize}
      totalRowCount={filteredRows.length}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      data-testid="attendance-exceptions-pagination"
    />
  );

  const columns = React.useMemo<ColumnDef<ExceptionRow, unknown>[]>(
    () => [
      {
        id: "shift_date",
        accessorKey: "shift_date",
        header: "Date",
        cell: ({ row }) => (
          <time dateTime={row.original.shift_date} className="tabular-nums">
            {row.original.shift_date
              ? format(parseIsoDateLocal(row.original.shift_date), "EEE, MMM d")
              : "—"}
          </time>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Issue",
        cell: ({ row }) => {
          // Shift name/code folded in as a subtitle — saves a column and
          // reads faster ("Late arrival · Morning" is one glance). Empty
          // string when there's no shift metadata.
          const shiftLabel = row.original.shift_type_name ?? row.original.shift_type_code;
          return (
            <span className="flex flex-col gap-0.5">
              <span className="text-foreground font-medium">{TYPE_LABEL[row.original.type]}</span>
              {shiftLabel ? (
                <span className="text-foreground-subtle text-[11px]">{shiftLabel}</span>
              ) : null}
            </span>
          );
        },
      },
      {
        // Consolidated state column — replaces the previous separate
        // "Status" (badge) + "Your input" (prose) pair. One visual
        // signal per row: icon + primary label (action-required for
        // unjustified / rejected; progress for pending_review; terminal
        // for justified) + optional attachment chip for submissions
        // that carry supporting documents.
        id: "state",
        accessorKey: "status",
        header: "State",
        cell: ({ row }) => {
          const status = row.original.status;
          const hasAttachments = row.original.attachments.length > 0;

          // One label per state. The tab has a single job — get
          // unjustified exceptions to HR — so the unjustified row always
          // says "Request HR review" regardless of whether the user
          // happens to have left a punch note at clock-in/out. The note
          // itself is auto-displayed inside the inline editor when the
          // user expands the row, so it never gets lost.
          const copy: { icon: React.ReactNode; label: string; className: string } =
            status === "rejected"
              ? {
                  icon: <XCircle aria-hidden className="size-3.5" />,
                  label: "Edit & resubmit",
                  className: "text-status-danger-foreground",
                }
              : status === "pending_review"
                ? {
                    icon: <Clock4 aria-hidden className="size-3.5" />,
                    label: "Awaiting HR",
                    className: "text-status-info-foreground",
                  }
                : status === "justified"
                  ? {
                      icon: <CheckCircle2 aria-hidden className="size-3.5" />,
                      label: "Approved",
                      className: "text-status-success-foreground",
                    }
                  : {
                      icon: <StickyNote aria-hidden className="size-3.5" />,
                      label: "Request HR review",
                      className: "text-status-warning-foreground",
                    };

          return (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${copy.className}`}
            >
              {copy.icon}
              <span>{copy.label}</span>
              {hasAttachments ? (
                <span
                  className="text-foreground-subtle inline-flex items-center gap-0.5"
                  aria-label={`${row.original.attachments.length} attachment${row.original.attachments.length === 1 ? "" : "s"}`}
                >
                  <Paperclip aria-hidden className="size-3" />
                  {row.original.attachments.length}
                </span>
              ) : null}
            </span>
          );
        },
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "chevron",
        header: () => <span className="sr-only">Expand</span>,
        cell: ({ row }) => (
          <span className="flex justify-end">
            {row.getIsExpanded() ? (
              <ChevronDown aria-hidden className="text-foreground-muted size-4" />
            ) : (
              <ChevronRight aria-hidden className="text-foreground-muted size-4" />
            )}
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

  if (rows.length === 0) {
    return (
      <EmptyState
        variant="first-use"
        title="No exceptions on record"
        description="Any late arrivals, early departures, or absences will appear here automatically."
        data-testid="attendance-exceptions-empty"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="attendance-exceptions">
      {actionableCount >= UNJUSTIFIED_BANNER_THRESHOLD ? (
        <Alert variant="destructive" data-testid="attendance-exceptions-banner">
          <AlertTitle>
            {actionableCount === 1
              ? "1 exception needs your attention"
              : `${actionableCount} exceptions need your attention`}
          </AlertTitle>
          <AlertDescription>
            Tap any row to review the exception, add a note, and attach supporting documents for HR.
          </AlertDescription>
        </Alert>
      ) : null}

      <FilterableDataTable<ExceptionRow>
        data-testid="attendance-exceptions-table"
        toolbar={filtersToolbar}
        hasActiveFilters={hasActiveFilters}
        table={{
          data: visibleRows,
          columns,
          mobileFieldPriority: ["shift_date", "type", "state"],
          getRowId: (row) => row.id,
          density: "comfortable",
          renderSubComponent: (row) => (
            <ExceptionDetail row={row.original} staffRecordId={staffRecordId} />
          ),
        }}
        pagination={paginationFooter}
        emptyState={{
          variant: "filtered-out",
          title: "No exceptions match your filters",
          description: "Clear a filter or pick a different view to see more rows.",
          "data-testid": "attendance-exceptions-empty-filtered",
        }}
      />
    </div>
  );
}

/**
 * ExceptionDetail — inline expansion body rendered under the parent row
 * via `<DataTable renderSubComponent={...}>`. Same content as the
 * previous Sheet-based detail (ADR-0007 four-state workflow), just
 * inline instead of in a side drawer.
 */
type PendingAttachment = Readonly<{
  id: string;
  name: string;
  size: number;
  blob: Blob;
}>;

function ExceptionDetail({
  row,
  staffRecordId,
}: Readonly<{
  row: ExceptionRow;
  staffRecordId: string;
}>) {
  const router = useRouter();
  const [text, setText] = React.useState(
    row.status === "rejected" ? (row.staff_clarification ?? "") : "",
  );
  const [pendingFiles, setPendingFiles] = React.useState<ReadonlyArray<PendingAttachment>>([]);
  const [isSubmitting, startTransition] = React.useTransition();
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const canEdit = row.status === "unjustified" || row.status === "rejected";
  const submitDisabled =
    !canEdit ||
    text.trim().length < 3 ||
    isSubmitting ||
    uploading ||
    pendingFiles.length > MAX_ATTACHMENTS;

  const onFileSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(event.target.files ?? []);
      if (incoming.length === 0) return;

      const next: PendingAttachment[] = [...pendingFiles];
      for (const file of incoming) {
        if (!ACCEPTED_MIME.has(file.type)) {
          toastError({
            success: false,
            error: "VALIDATION_FAILED",
            fields: { [file.name]: "Only JPEG, PNG, WebP, HEIC, or PDF files are accepted." },
          });
          continue;
        }
        if (file.size > MAX_BYTES) {
          toastError({
            success: false,
            error: "VALIDATION_FAILED",
            fields: { [file.name]: "File exceeds 10 MB." },
          });
          continue;
        }
        if (next.length >= MAX_ATTACHMENTS) {
          toastInfo(`Maximum ${MAX_ATTACHMENTS} attachments — remove one to add another.`);
          break;
        }
        next.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          blob: file,
        });
      }
      setPendingFiles(next);
      // Clear the native input so selecting the same file twice re-fires.
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [pendingFiles],
  );

  const removePending = React.useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const onSubmit = React.useCallback(() => {
    startTransition(async () => {
      let attachmentPaths: string[] = [];
      if (pendingFiles.length > 0) {
        setUploading(true);
        try {
          attachmentPaths = await Promise.all(
            pendingFiles.map((f) =>
              uploadClarificationAttachment(f.blob, row.id, staffRecordId, f.name),
            ),
          );
        } catch (err) {
          toastError({ success: false, error: "DEPENDENCY_FAILED" });
          if (err instanceof Error) toastInfo(`Upload failed: ${err.message}`);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const result = await submitClarificationAction({
        exceptionId: row.id,
        text: text.trim(),
        attachmentPaths,
      });

      if (result.success) {
        toastSuccess(row.status === "rejected" ? "Resubmitted to HR." : "Sent to HR for review.");
        router.refresh();
      } else {
        toastError(result);
      }
    });
  }, [row, text, pendingFiles, staffRecordId, router]);

  return (
    <div
      data-testid={`attendance-exception-detail-${row.id}`}
      onClick={(event) => event.stopPropagation()}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <p className="text-foreground text-sm font-semibold">{TYPE_LABEL[row.type]}</p>
        <p className="text-foreground-muted text-xs">
          {row.shift_type_name ?? row.shift_type_code ?? "Shift"} ·{" "}
          {row.shift_date ? format(parseIsoDateLocal(row.shift_date), "EEE, MMM d yyyy") : ""}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <Meta label="Status" value={humanStatus(row.status)} />
        <Meta label="Logged at" value={formatAtFacility(row.created_at, "MMM d, p")} />
      </section>

      {row.detail ? <ReadBlock label="What the system recorded" body={row.detail} /> : null}

      {row.punch_remark ? (
        <ReadBlock
          label="Note you left when punching"
          icon={<StickyNote aria-hidden className="size-3.5" />}
          body={row.punch_remark}
          tone="neutral"
          data-testid={`attendance-exception-punch-note-${row.id}`}
        />
      ) : null}

      {row.status !== "unjustified" && row.staff_clarification ? (
        <ReadBlock
          label={
            row.status === "pending_review"
              ? "What you submitted"
              : row.status === "rejected"
                ? "Your previous submission"
                : "Clarification you sent HR"
          }
          icon={<MessageSquareText aria-hidden className="size-3.5" />}
          body={row.staff_clarification}
          tone="info"
          data-testid={`attendance-exception-clarification-${row.id}`}
        />
      ) : null}

      {row.attachments.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="text-foreground-subtle inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
            <Paperclip aria-hidden className="size-3.5" />
            Attachments ({row.attachments.length})
          </p>
          <ul
            className="flex flex-col gap-1.5"
            data-testid={`attendance-exception-attachments-${row.id}`}
          >
            {row.attachments.map((a) => (
              <li
                key={a.id}
                className="border-border-subtle bg-surface flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <FileText aria-hidden className="text-foreground-muted size-4 shrink-0" />
                <span className="truncate">{a.file_name}</span>
                <span className="text-foreground-subtle ml-auto shrink-0 text-xs tabular-nums">
                  {humanSize(a.file_size_bytes)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {row.hr_note ? (
        <ReadBlock
          label={row.status === "rejected" ? "Why HR rejected" : "HR note"}
          icon={
            row.status === "justified" ? (
              <CheckCircle2 aria-hidden className="size-3.5" />
            ) : row.status === "rejected" ? (
              <XCircle aria-hidden className="size-3.5" />
            ) : undefined
          }
          body={row.hr_note}
          tone={row.status === "justified" ? "success" : "neutral"}
          data-testid={`attendance-exception-hr-note-${row.id}`}
        />
      ) : null}

      {canEdit ? (
        <div className="border-border-subtle flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`exception-clarify-${row.id}`}
              className="text-foreground inline-flex items-center gap-2 text-xs font-medium"
            >
              <MessageSquareText aria-hidden className="size-3.5" />
              {row.status === "rejected"
                ? "Edit your note and resubmit"
                : row.punch_remark
                  ? "Add more context for HR"
                  : "Explain what happened"}
            </label>
            <p className="text-foreground-muted text-[11px]">
              {row.status === "rejected"
                ? "HR rejected your previous note. Revise and resubmit — the request will go back for review."
                : "Write a short explanation and attach any supporting documents so HR can justify this exception."}
            </p>
            <Textarea
              id={`exception-clarify-${row.id}`}
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What happened? E.g. traffic delay, family emergency, prior approval from supervisor."
              maxLength={CLARIFICATION_MAX_LEN}
              disabled={isSubmitting}
              data-testid={`attendance-clarify-input-${row.id}`}
            />
            <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
              {text.trim().length < 3 ? (
                <p
                  className="text-foreground-muted"
                  data-testid={`attendance-clarify-min-hint-${row.id}`}
                >
                  {3 - text.trim().length} more character
                  {3 - text.trim().length === 1 ? "" : "s"} to submit
                </p>
              ) : (
                <span />
              )}
              <p className="text-foreground-subtle">
                {text.length}/{CLARIFICATION_MAX_LEN}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`exception-attachments-${row.id}`}
                className="text-foreground inline-flex items-center gap-2 text-xs font-medium"
              >
                <Paperclip aria-hidden className="size-3.5" />
                Attachments ({pendingFiles.length}/{MAX_ATTACHMENTS})
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || pendingFiles.length >= MAX_ATTACHMENTS}
                data-testid={`attendance-attach-trigger-${row.id}`}
              >
                <Upload aria-hidden className="size-3.5" />
                Add file
              </Button>
              <input
                ref={fileInputRef}
                id={`exception-attachments-${row.id}`}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="sr-only"
                onChange={onFileSelect}
                disabled={isSubmitting}
              />
            </div>
            {pendingFiles.length > 0 ? (
              <ul
                className="flex flex-col gap-1.5"
                data-testid={`attendance-pending-attachments-${row.id}`}
              >
                {pendingFiles.map((f) => (
                  <li
                    key={f.id}
                    className="border-border-subtle bg-surface flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <FileText aria-hidden className="text-foreground-muted size-4 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-foreground-subtle ml-auto shrink-0 text-xs tabular-nums">
                      {humanSize(f.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePending(f.id)}
                      className="text-foreground-muted hover:text-foreground focus-visible:outline-ring -mr-1 grid size-6 place-items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
                      aria-label={`Remove ${f.name}`}
                      disabled={isSubmitting}
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-foreground-subtle text-[11px]">
                Optional — attach MC, receipts, photos (JPEG, PNG, WebP, HEIC, PDF — up to 10 MB
                each).
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              aria-busy={isSubmitting || uploading || undefined}
              data-testid={`attendance-clarify-submit-${row.id}`}
            >
              {uploading
                ? "Uploading…"
                : isSubmitting
                  ? "Sending…"
                  : row.status === "rejected"
                    ? "Resubmit"
                    : "Send to HR"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function humanStatus(status: ExceptionRow["status"]): string {
  switch (status) {
    case "unjustified":
      return "Needs review";
    case "pending_review":
      return "Awaiting HR";
    case "justified":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Meta({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-foreground-subtle text-[11px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function ReadBlock({
  label,
  icon,
  body,
  tone,
  "data-testid": testId,
}: Readonly<{
  label: string;
  icon?: React.ReactNode;
  body: string;
  tone?: "info" | "success" | "neutral";
  "data-testid"?: string;
}>) {
  const toneClasses =
    tone === "info"
      ? "bg-status-info-bg-soft border-status-info-border"
      : tone === "success"
        ? "bg-status-success-bg-soft border-status-success-border"
        : "bg-surface border-border-subtle";
  return (
    <section
      className={`flex flex-col gap-1 rounded-md border p-3 ${toneClasses}`}
      data-testid={testId}
    >
      <p className="text-foreground-subtle inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
        {icon}
        {label}
      </p>
      <p className="text-foreground text-sm whitespace-pre-wrap">{body}</p>
    </section>
  );
}

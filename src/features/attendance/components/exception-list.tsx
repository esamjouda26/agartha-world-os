"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
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
import { parseIsoDateLocal } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastInfo, toastSuccess } from "@/components/ui/toast-helpers";
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
 * Tabular layout per frontend_spec.md:4235. Built on the shared
 * `<DataTable>` primitive — desktop renders the table; mobile collapses
 * to cards via `mobileFieldPriority`. Row click opens the detail sheet.
 *
 * ADR-0007 adds a four-state workflow to the detail sheet:
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

export function ExceptionList({ rows, staffRecordId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Rows that need the user's action: either never-submitted
  // (`unjustified`) or rejected and awaiting resubmission.
  const actionableCount = useMemo(
    () => rows.filter((row) => row.status === "unjustified" || row.status === "rejected").length,
    [rows],
  );

  const columns = useMemo<ColumnDef<ExceptionRow, unknown>[]>(
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
                  : row.original.punch_remark
                    ? {
                        icon: <StickyNote aria-hidden className="size-3.5" />,
                        label: "Review punch note",
                        className: "text-status-warning-foreground",
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
      },
      {
        id: "chevron",
        header: "",
        cell: () => (
          <span className="flex justify-end">
            <ChevronRight aria-hidden className="text-foreground-muted size-4" />
          </span>
        ),
      },
    ],
    [],
  );

  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;

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

      <DataTable<ExceptionRow>
        data={rows}
        columns={columns}
        mobileFieldPriority={["shift_date", "type", "state"]}
        toolbar="none"
        getRowId={(row) => row.id}
        density="comfortable"
        onRowClick={(row) => setSelectedId(row.id)}
        data-testid="attendance-exceptions-table"
      />

      <ExceptionDetailSheet
        row={selectedRow}
        staffRecordId={staffRecordId}
        open={selectedRow !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

type PendingAttachment = Readonly<{
  id: string;
  name: string;
  size: number;
  blob: Blob;
}>;

function ExceptionDetailSheet({
  row,
  staffRecordId,
  open,
  onClose,
}: Readonly<{
  row: ExceptionRow | null;
  staffRecordId: string;
  open: boolean;
  onClose: () => void;
}>) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<ReadonlyArray<PendingAttachment>>([]);
  const [isSubmitting, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset the editor when the sheet switches between rows. Prefill the
  // text with the existing clarification when resubmitting after
  // rejection — the user is usually revising, not starting over.
  useEffect(() => {
    if (!row) {
      setText("");
      setPendingFiles([]);
      return;
    }
    setText(row.status === "rejected" ? (row.staff_clarification ?? "") : "");
    setPendingFiles([]);
  }, [row?.id, row?.status, row?.staff_clarification]);

  const canEdit = row?.status === "unjustified" || row?.status === "rejected";
  const submitDisabled =
    !canEdit ||
    text.trim().length < 3 ||
    isSubmitting ||
    uploading ||
    pendingFiles.length > MAX_ATTACHMENTS;

  const onFileSelect = useCallback(
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

  const removePending = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const onSubmit = useCallback(() => {
    if (!row) return;
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
        onClose();
      } else {
        toastError(result);
      }
    });
  }, [row, text, pendingFiles, staffRecordId, router, onClose]);

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-lg"
        data-testid="attendance-exception-sheet"
      >
        <SheetHeader className="border-border-subtle border-b">
          <SheetTitle>{row ? TYPE_LABEL[row.type] : "Exception"}</SheetTitle>
          <SheetDescription>
            {row ? (
              <>
                {row.shift_type_name ?? row.shift_type_code ?? "Shift"} ·{" "}
                {row.shift_date ? format(parseIsoDateLocal(row.shift_date), "EEE, MMM d yyyy") : ""}
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {row ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-4 text-sm">
              <Meta label="Status" value={humanStatus(row.status)} />
              <Meta label="Logged at" value={format(parseISO(row.created_at), "MMM d, p")} />
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
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="exception-clarify"
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
                    id="exception-clarify"
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
                      htmlFor="exception-attachments"
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
                      id="exception-attachments"
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
                      Optional — attach MC, receipts, photos (JPEG, PNG, WebP, HEIC, PDF — up to 10
                      MB each).
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <SheetFooter className="border-border-subtle gap-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          {canEdit ? (
            <Button
              onClick={onSubmit}
              disabled={submitDisabled}
              aria-busy={isSubmitting || uploading || undefined}
              data-testid={`attendance-clarify-submit-${row?.id}`}
            >
              {uploading
                ? "Uploading…"
                : isSubmitting
                  ? "Sending…"
                  : row?.status === "rejected"
                    ? "Resubmit"
                    : "Send to HR"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
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

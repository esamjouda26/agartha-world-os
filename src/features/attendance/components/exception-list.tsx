"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronRight, MessageSquareText, StickyNote } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { UNJUSTIFIED_BANNER_THRESHOLD } from "@/features/attendance/constants";
import { addClarificationAction } from "@/features/attendance/actions/add-clarification";
import type { ExceptionRow, ExceptionType } from "@/features/attendance/types";

/**
 * Tab-2 "My Exceptions" surface.
 *
 * Tabular layout per frontend_spec.md:4235 ("Columns: shift_date,
 * shift_type name, issue type, status, punch_remark, staff_clarification,
 * justification_reason"). Built on the shared `<DataTable>` primitive —
 * desktop renders the table; mobile collapses to cards via
 * `mobileFieldPriority`. The whole row is clickable on both surfaces via
 * `onRowClick` (newly added to the primitive), so mobile users can tap to
 * open the detail sheet without a separate action button.
 */

type Props = Readonly<{
  rows: ReadonlyArray<ExceptionRow>;
}>;

const TYPE_LABEL: Record<ExceptionType, string> = {
  late_arrival: "Late arrival",
  early_departure: "Early departure",
  missing_clock_in: "Missing clock-in",
  missing_clock_out: "Missing clock-out",
  absent: "Absent",
};

export function ExceptionList({ rows }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unjustifiedCount = useMemo(
    () => rows.filter((row) => row.status === "unjustified").length,
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
              ? format(parseISO(row.original.shift_date), "EEE, MMM d")
              : "—"}
          </time>
        ),
      },
      {
        id: "shift_type",
        accessorKey: "shift_type_name",
        header: "Shift",
        cell: ({ row }) => row.original.shift_type_name ?? row.original.shift_type_code ?? "—",
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Issue",
        cell: ({ row }) => TYPE_LABEL[row.original.type],
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            enum="exception_status"
            label={row.original.status === "unjustified" ? "Needs review" : "Resolved"}
          />
        ),
      },
      {
        id: "note_state",
        accessorKey: "staff_clarification",
        header: "Your input",
        cell: ({ row }) => {
          const hasClarification = Boolean(row.original.staff_clarification);
          const hasPunchNote = Boolean(row.original.punch_remark);
          if (hasClarification) {
            return (
              <span className="text-foreground-muted line-clamp-1 text-left">
                {row.original.staff_clarification}
              </span>
            );
          }
          if (hasPunchNote) {
            return (
              <span className="text-status-info-foreground inline-flex items-center gap-1 text-xs font-medium">
                <StickyNote aria-hidden className="size-3.5" />
                You left a punch note
              </span>
            );
          }
          if (row.original.status === "unjustified") {
            return (
              <span className="text-status-warning-foreground text-xs font-medium">
                Clarification needed
              </span>
            );
          }
          return <span className="text-foreground-subtle">—</span>;
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
      {unjustifiedCount >= UNJUSTIFIED_BANNER_THRESHOLD ? (
        <Alert variant="destructive" data-testid="attendance-exceptions-banner">
          <AlertTitle>
            {unjustifiedCount === 1
              ? "1 exception needs your clarification"
              : `${unjustifiedCount} exceptions need your clarification`}
          </AlertTitle>
          <AlertDescription>
            Tap any row to review the exception and explain what happened.
          </AlertDescription>
        </Alert>
      ) : null}

      <DataTable<ExceptionRow>
        data={rows}
        columns={columns}
        mobileFieldPriority={["shift_date", "type", "status", "note_state"]}
        getRowId={(row) => row.id}
        density="comfortable"
        onRowClick={(row) => setSelectedId(row.id)}
        data-testid="attendance-exceptions-table"
      />

      <ExceptionDetailSheet
        row={selectedRow}
        open={selectedRow !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function ExceptionDetailSheet({
  row,
  open,
  onClose,
}: Readonly<{
  row: ExceptionRow | null;
  open: boolean;
  onClose: () => void;
}>) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset the textarea when the sheet switches between rows.
  useEffect(() => {
    setText("");
  }, [row?.id]);

  const onSubmit = useCallback(() => {
    if (!row) return;
    startTransition(async () => {
      const result = await addClarificationAction({ exceptionId: row.id, text });
      if (result.success) {
        toastSuccess("Clarification sent to HR.");
        router.refresh();
        onClose();
      } else {
        toastError(result);
      }
    });
  }, [row, text, router, onClose]);

  const hasPunchNote = Boolean(row?.punch_remark);
  const hasClarification = Boolean(row?.staff_clarification);
  const hasJustification = Boolean(row?.justification_reason);
  const canSubmit = row?.status === "unjustified" && !hasClarification && text.trim().length >= 3;

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
                {row.shift_date ? format(parseISO(row.shift_date), "EEE, MMM d yyyy") : ""}
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {row ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-4 text-sm">
              <Meta
                label="Status"
                value={row.status === "unjustified" ? "Needs review" : "Resolved"}
              />
              <Meta label="Logged at" value={format(parseISO(row.created_at), "MMM d, p")} />
            </section>

            {row.detail ? <ReadBlock label="What the system recorded" body={row.detail} /> : null}

            {/* Punch note — the free-text the user entered AT THE TIME of
                clocking in/out. Distinct from the later clarification
                they give to HR. Labeled explicitly so the user doesn't
                confuse the two. */}
            {hasPunchNote ? (
              <ReadBlock
                label="Note you left when punching"
                icon={<StickyNote aria-hidden className="size-3.5" />}
                body={row.punch_remark ?? ""}
                tone="neutral"
                data-testid={`attendance-exception-punch-note-${row.id}`}
              />
            ) : null}

            {/* Clarification — the longer explanation the user writes
                AFTER the exception has been flagged, intended for HR. */}
            {hasClarification ? (
              <ReadBlock
                label="Clarification you sent HR"
                icon={<MessageSquareText aria-hidden className="size-3.5" />}
                body={row.staff_clarification ?? ""}
                tone="info"
                data-testid={`attendance-exception-clarification-${row.id}`}
              />
            ) : null}

            {hasJustification ? (
              <ReadBlock
                label="HR resolution"
                body={row.justification_reason ?? ""}
                tone="success"
              />
            ) : null}

            {row.status === "unjustified" && !hasClarification ? (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="exception-clarify"
                  className="text-foreground inline-flex items-center gap-2 text-xs font-medium"
                >
                  <MessageSquareText aria-hidden className="size-3.5" />
                  {hasPunchNote ? "Add more context for HR" : "Explain what happened"}
                </label>
                <p className="text-foreground-muted text-[11px]">
                  {hasPunchNote
                    ? "You already left a short note at the time. Add a fuller explanation here — HR uses it to justify or convert the exception to leave."
                    : "Write a short explanation so HR can justify this exception or convert it to leave."}
                </p>
                <Textarea
                  id="exception-clarify"
                  rows={4}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="What happened? E.g. traffic delay, family emergency, prior approval from supervisor."
                  maxLength={500}
                  disabled={isPending}
                  data-testid={`attendance-clarify-input-${row.id}`}
                />
                <p className="text-foreground-subtle self-end text-[11px] tabular-nums">
                  {text.length}/500
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <SheetFooter className="border-border-subtle gap-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Close
          </Button>
          {row?.status === "unjustified" && !hasClarification ? (
            <Button
              onClick={onSubmit}
              disabled={!canSubmit || isPending}
              aria-busy={isPending || undefined}
              data-testid={`attendance-clarify-submit-${row.id}`}
            >
              {isPending ? "Sending…" : "Send to HR"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
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

"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, AlertTriangle, Edit, ArrowRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/ui/form-section";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { SectionCard } from "@/components/ui/section-card";
import { UtilizationCalendar, type DailyUtilization } from "@/components/shared/utilization-calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";
import { useUrlString } from "@/components/shared/url-state-helpers";

import type { SchedulerPageData, SlotRow } from "@/features/operations/queries/get-scheduler-data";
import { editSlotSchema, CONSTRAINT_TYPES, CONSTRAINT_LABELS, type EditSlotInput } from "@/features/operations/schemas/scheduler";
import { editSlot, previewSlotOverride, type CascadeMove } from "@/features/operations/actions/scheduler-actions";

// ── Constants ──────────────────────────────────────────────────────────

/** Sentinel for "no constraint" so Radix Select never receives an empty string value. */
const NO_CONSTRAINT = "__none__";

// ── Types ──────────────────────────────────────────────────────────────

type SchedulerViewProps = Readonly<{ data: SchedulerPageData; canEdit: boolean }>;

function loadColor(pct: number): "destructive" | "secondary" | "outline" {
  if (pct >= 90) return "destructive";
  if (pct >= 70) return "secondary";
  return "outline";
}

// ── Cascade Preview Dialog ────────────────────────────────────────────

type CascadePreviewProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moves: CascadeMove[];
  pendingValues: EditSlotInput | null;
  onConfirm: () => void;
  confirming: boolean;
}>;

function CascadePreviewDialog({ open, onOpenChange, moves, pendingValues, onConfirm, confirming }: CascadePreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="cascade-preview-dialog">
        <DialogHeader>
          <DialogTitle>Cascade Preview</DialogTitle>
          <DialogDescription>
            The new capacity ({pendingValues?.overrideCapacity ?? 0}) is below the current booked count.
            The following bookings will be moved to available slots:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {moves.length === 0 ? (
            <SectionCard>
              <div className="flex flex-col items-center gap-2 py-4 text-center text-foreground-muted">
                <AlertTriangle className="size-6" />
                <p className="text-sm">No available slots for overflow bookings. Some bookings may remain unresolved.</p>
              </div>
            </SectionCard>
          ) : (
            moves.map((move) => (
              <SectionCard key={move.bookingId} data-testid={`cascade-move-${move.bookingId}`}>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{move.currentSlotDate}</span>
                    <span className="text-xs text-foreground-muted">{move.currentSlotTime.slice(0, 5)}</span>
                  </div>
                  <ArrowRight className="size-4 text-foreground-muted shrink-0" aria-hidden />
                  <div className="flex flex-col">
                    <span className="font-medium">{move.targetSlotDate}</span>
                    <span className="text-xs text-foreground-muted">{move.targetSlotTime.slice(0, 5)}</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs">{move.bookingId.slice(0, 8)}…</Badge>
                </div>
              </SectionCard>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming} data-testid="cascade-cancel">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={confirming} data-testid="cascade-confirm">
            {confirming ? "Applying…" : `Confirm Override (${moves.length} moved)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

export function SchedulerView({ data, canEdit }: SchedulerViewProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<SlotRow | null>(null);
  const [pending, setPending] = React.useState(false);

  // URL-backed filters via nuqs (shallow: false is baked into useUrlString)
  const expFilter = useUrlString("experience");
  const dateFilter = useUrlString("date");

  // Two-step cascade state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [cascadeMoves, setCascadeMoves] = React.useState<CascadeMove[]>([]);
  const [pendingValues, setPendingValues] = React.useState<EditSlotInput | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  const form = useForm<EditSlotInput>({
    resolver: zodResolver(editSlotSchema) as Resolver<EditSlotInput>,
    defaultValues: { slotId: "", overrideCapacity: 0, constraintType: null, constraintNotes: null },
  });

  const openEdit = (slot: SlotRow) => {
    setEditingSlot(slot);
    form.reset({
      slotId: slot.id,
      overrideCapacity: slot.effectiveCapacity,
      constraintType: (slot.constraintType as EditSlotInput["constraintType"]) ?? null,
      constraintNotes: slot.constraintNotes,
    });
    setSheetOpen(true);
  };

  /**
   * Two-step submit handler:
   * 1. If new capacity >= booked count → direct edit (no cascade).
   * 2. If new capacity < booked count → preview → confirm.
   */
  const handleSubmit = async (values: EditSlotInput) => {
    setPending(true);
    try {
      const isOverflow = editingSlot && values.overrideCapacity < editingSlot.bookedCount;
      if (isOverflow) {
        const preview = await previewSlotOverride(values.slotId, values.overrideCapacity);
        if (!preview.success) { toastError(preview); return; }
        setPendingValues(values);
        setCascadeMoves(preview.data.moves);
        setSheetOpen(false);
        setPreviewOpen(true);
      } else {
        const result = await editSlot(values);
        if (result.success) { toastSuccess("Slot updated"); setSheetOpen(false); }
        else toastError(result);
      }
    } finally { setPending(false); }
  };

  const handleCascadeConfirm = async () => {
    if (!pendingValues) return;
    setConfirming(true);
    try {
      const result = await editSlot(pendingValues);
      if (result.success) {
        toastSuccess("Slot updated with cascade");
        setPreviewOpen(false);
        setPendingValues(null);
        setCascadeMoves([]);
      } else { toastError(result); }
    } finally { setConfirming(false); }
  };

  const hasActiveFilters = Boolean(expFilter.value || dateFilter.value);

  const utilizationData = React.useMemo<DailyUtilization[]>(() => {
    const map = new Map<string, { booked: number; cap: number }>();
    for (const s of data.slots) {
      const existing = map.get(s.slotDate) || { booked: 0, cap: 0 };
      map.set(s.slotDate, { booked: existing.booked + s.bookedCount, cap: existing.cap + s.effectiveCapacity });
    }
    return Array.from(map.entries()).map(([date, { booked, cap }]) => ({
      date,
      bookedCount: booked,
      capacity: cap,
      loadPct: cap > 0 ? Math.round((booked / cap) * 100) : 0,
    }));
  }, [data.slots]);

  const columns = React.useMemo<ColumnDef<SlotRow, unknown>[]>(() => [
    { id: "date", accessorKey: "slotDate", header: "Date", meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" } },
    { id: "time", header: "Time", cell: ({ row }) => `${row.original.startTime.slice(0, 5)} – ${row.original.endTime.slice(0, 5)}`, meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" } },
    { id: "utilization", header: "Utilization", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-2 w-20 overflow-hidden rounded-full bg-muted">
          <div className={cn("absolute left-0 top-0 h-full rounded-full", row.original.loadPct >= 90 ? "bg-red-500" : row.original.loadPct >= 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(row.original.loadPct, 100)}%` }} />
        </div>
        <span className="text-xs text-foreground-muted">{row.original.bookedCount}/{row.original.effectiveCapacity}</span>
      </div>
    ) },
    { id: "load", header: "Load", cell: ({ row }) => <Badge variant={loadColor(row.original.loadPct)}>{row.original.loadPct}%</Badge>, meta: { headerClassName: "w-0", cellClassName: "w-0" } },
    { id: "constraint", header: "Constraint", cell: ({ row }) => row.original.constraintType ? <Badge variant="secondary">{CONSTRAINT_LABELS[row.original.constraintType as keyof typeof CONSTRAINT_LABELS] ?? row.original.constraintType}</Badge> : <span className="text-foreground-muted">—</span> },
    ...(canEdit ? [{ id: "actions" as const, header: "", cell: ({ row }: { row: { original: SlotRow } }) => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }} data-testid={`edit-slot-${row.original.id}`}><Edit className="size-3" /></Button>, meta: { headerClassName: "w-0", cellClassName: "w-0" } }] : []),
  ], [canEdit]);

  return (
    <div className="flex flex-col gap-6" data-testid="scheduler-page">
      <PageHeader eyebrow="Operations" title="Operational Timeline" description="Slot utilization, booking capacity, and overrides." data-testid="scheduler-header" />

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="flex flex-col gap-2">
          <UtilizationCalendar
            utilizationData={utilizationData}
            selectedDate={dateFilter.value}
            onDateSelect={(d) => dateFilter.set(d)}
            className="w-full max-w-[320px] mx-auto lg:mx-0 bg-card"
            data-testid="scheduler-calendar"
          />
          <p className="text-xs text-foreground-muted text-center lg:text-left px-2">
            Select a date to filter slots.
          </p>
        </div>

        <div className="min-w-0">
          <FilterableDataTable<SlotRow>
            toolbar={
              <FilterBar
                data-testid="scheduler-filters"
                hasActiveFilters={hasActiveFilters}
                onClearAll={() => { expFilter.set(null); dateFilter.set(null); }}
                controls={<>
                  <Select value={expFilter.value ?? data.selectedExperienceId ?? "__none__"} onValueChange={(v) => expFilter.set(v === "__none__" ? null : v)}>
                    <SelectTrigger className="h-10 min-w-[12rem]" aria-label="Experience" data-testid="scheduler-exp-filter"><SelectValue placeholder="Experience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled className="hidden">Experience</SelectItem>
                      {data.experiences.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFilter.value ?? ""}
                    onChange={(e) => dateFilter.set(e.target.value || null)}
                    className="h-10 w-40"
                    aria-label="Date"
                    data-testid="scheduler-date-filter"
                  />
                </>}
              />
            }
            table={{ data: data.slots, columns, mobileFieldPriority: ["date", "time", "load"], getRowId: (r) => r.id }}
            hasActiveFilters={hasActiveFilters}
            emptyState={{ variant: hasActiveFilters ? "filtered-out" : "first-use", title: "No time slots", description: hasActiveFilters ? "Clear filters or select a different experience." : "Generate slots from the Experience Config page.", icon: <Calendar className="size-8" /> }}
            data-testid="scheduler-table"
          />
        </div>
      </div>

      <FormSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Edit Slot" description={editingSlot ? `${editingSlot.slotDate} ${editingSlot.startTime.slice(0, 5)} – ${editingSlot.endTime.slice(0, 5)} · ${editingSlot.bookedCount} booked` : ""} formId="edit-slot-form" submitLabel="Save Override" pending={pending} submitDisabled={pending} width="md" data-testid="edit-slot-sheet">
        <FormProvider {...form}>
          <form id="edit-slot-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
            <FormSection title="Capacity Override">
              <FormField control={form.control} name="overrideCapacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Capacity *</FormLabel>
                  <FormControl><Input {...field} onChange={(e) => field.onChange(Number(e.target.value))} type="number" data-testid="slot-capacity" /></FormControl>
                  {editingSlot && editingSlot.bookedCount > 0 && Number(field.value) < editingSlot.bookedCount && (
                    <p className="text-xs text-destructive mt-1">⚠ Capacity below booked count ({editingSlot.bookedCount}). A cascade preview will be shown before applying.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="constraintType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value ?? NO_CONSTRAINT} onValueChange={(v) => field.onChange(v === NO_CONSTRAINT ? null : v)}>
                    <FormControl><SelectTrigger data-testid="slot-constraint"><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CONSTRAINT}>None</SelectItem>
                      {CONSTRAINT_TYPES.map((t) => <SelectItem key={t} value={t}>{CONSTRAINT_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="constraintNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} rows={2} data-testid="slot-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>

      <CascadePreviewDialog
        open={previewOpen}
        onOpenChange={(v) => { if (!v) { setPreviewOpen(false); setPendingValues(null); setCascadeMoves([]); } }}
        moves={cascadeMoves}
        pendingValues={pendingValues}
        onConfirm={handleCascadeConfirm}
        confirming={confirming}
      />
    </div>
  );
}

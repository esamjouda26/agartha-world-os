"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * RosterTemplateGrid — visual cycle editor for `roster_template_shifts`.
 *
 * Renders a horizontal strip of `cycleLengthDays` cells. Each cell is a
 * dropdown of active shift types. An assigned day shows the shift name
 * with a color dot; an empty day shows "Off". Selecting a shift fires
 * `onAssign`; clicking × fires `onRemove`.
 *
 * This is a pure presentation component — the caller owns the mutation
 * logic (Server Actions) and data refresh.
 */

export type ShiftOption = Readonly<{
  id: string;
  name: string;
  code: string;
  color: string | null;
}>;

export type DayAssignment = Readonly<{
  id: string;
  dayIndex: number;
  shiftTypeId: string;
}>;

export type RosterTemplateGridProps = Readonly<{
  templateId: string;
  cycleLengthDays: number;
  assignments: readonly DayAssignment[];
  shiftOptions: readonly ShiftOption[];
  onAssign: (templateId: string, dayIndex: number, shiftTypeId: string) => void;
  onRemove: (assignmentId: string) => void;
  disabled?: boolean;
  "data-testid"?: string;
}>;

export function RosterTemplateGrid({
  templateId,
  cycleLengthDays,
  assignments,
  shiftOptions,
  onAssign,
  onRemove,
  disabled = false,
  "data-testid": testId,
}: RosterTemplateGridProps) {
  const days = React.useMemo(
    () => Array.from({ length: cycleLengthDays }, (_, i) => i + 1),
    [cycleLengthDays],
  );

  const assignmentMap = React.useMemo(() => {
    const m = new Map<number, DayAssignment>();
    for (const a of assignments) m.set(a.dayIndex, a);
    return m;
  }, [assignments]);

  const shiftMap = React.useMemo(() => {
    const m = new Map<string, ShiftOption>();
    for (const s of shiftOptions) m.set(s.id, s);
    return m;
  }, [shiftOptions]);

  return (
    <div data-slot="roster-template-grid" data-testid={testId} className="flex flex-col gap-2">
      <div className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
        Cycle Pattern ({cycleLengthDays} days)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {days.map((dayIndex) => {
          const assignment = assignmentMap.get(dayIndex);
          const shift = assignment ? shiftMap.get(assignment.shiftTypeId) : null;

          return (
            <div
              key={dayIndex}
              className={cn(
                "border-border-subtle bg-surface flex min-w-[5rem] flex-col items-center gap-1 rounded-lg border p-2",
                assignment ? "border-brand-primary/30" : "",
              )}
            >
              <span className="text-foreground-muted text-[10px] font-medium">Day {dayIndex}</span>
              {assignment && shift ? (
                <div className="flex items-center gap-1">
                  {shift.color ? (
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: shift.color }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="text-xs font-medium">{shift.code}</span>
                  {!disabled ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5"
                      data-testid={`${testId ?? "grid"}-remove-${dayIndex}`}
                      onClick={() => onRemove(assignment.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Select
                  disabled={disabled}
                  onValueChange={(v) => onAssign(templateId, dayIndex, v)}
                >
                  <SelectTrigger
                    className="h-6 w-16 text-[10px]"
                    data-testid={`${testId ?? "grid"}-assign-${dayIndex}`}
                  >
                    <SelectValue placeholder="Off" />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

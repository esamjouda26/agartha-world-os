"use client";

import * as React from "react";
import { Edit3, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { deleteScheduleAction } from "@/features/reports/actions/delete-schedule";
import { toggleScheduleActiveAction } from "@/features/reports/actions/toggle-schedule-active";
import { REPORT_LABEL } from "@/features/reports/constants";
import type { SavedReport } from "@/features/reports/queries/list-reports";

export type ScheduleListProps = Readonly<{
  schedules: readonly SavedReport[];
  onEdit: (schedule: SavedReport) => void;
  onCreate: () => void;
}>;

/**
 * List of the caller's saved report schedules with edit / pause-resume
 * / delete affordances. Excludes the ad-hoc `is_active=false` one-off
 * configs — those land in the execution history table only.
 */
export function ScheduleList({ schedules, onEdit, onCreate }: ScheduleListProps) {
  // Filter out one-off configs (no cron set) — they're visible only through
  // their execution rows.
  const schedulesOnly = schedules.filter((s) => s.scheduleCron !== null);

  if (schedulesOnly.length === 0) {
    return (
      <Card data-testid="report-schedule-list-empty">
        <CardHeader>
          <CardTitle>Scheduled reports</CardTitle>
          <CardDescription>No schedules yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyStateCta
            variant="first-use"
            title="No scheduled reports"
            description="Set up a recurring report so it lands in recipients' inboxes on a cron schedule."
            ctaLabel="New schedule"
            onClick={onCreate}
            data-testid="report-schedule-empty"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="report-schedule-list">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Scheduled reports</CardTitle>
            <CardDescription>Paused schedules stay saved; resume anytime.</CardDescription>
          </div>
          <Button type="button" onClick={onCreate} data-testid="report-schedule-list-create">
            New schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-border-subtle flex flex-col divide-y">
        {schedulesOnly.map((s) => (
          <ScheduleRow key={s.id} schedule={s} onEdit={onEdit} />
        ))}
      </CardContent>
    </Card>
  );
}

function ScheduleRow({
  schedule,
  onEdit,
}: Readonly<{ schedule: SavedReport; onEdit: (s: SavedReport) => void }>) {
  const [isToggling, startToggle] = React.useTransition();
  const [isDeleting, startDelete] = React.useTransition();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleToggle = (next: boolean) => {
    startToggle(async () => {
      const result = await toggleScheduleActiveAction({ id: schedule.id, isActive: next });
      if (result.success) {
        toastSuccess(next ? "Schedule resumed" : "Schedule paused");
      } else {
        toastError(result);
      }
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteScheduleAction({ id: schedule.id });
      if (result.success) {
        toastSuccess("Schedule deleted");
        setDialogOpen(false);
      } else {
        toastError(result);
      }
    });
  };

  return (
    <div
      className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
      data-testid={`report-schedule-row-${schedule.id}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground text-sm font-semibold">
            {REPORT_LABEL[schedule.reportType]}
          </span>
          <StatusBadge
            status={schedule.isActive ? "active" : "paused"}
            label={schedule.isActive ? "Active" : "Paused"}
          />
        </div>
        <p className="text-foreground-muted text-xs">
          <code>{schedule.scheduleCron}</code>
          {schedule.recipients.length > 0
            ? ` · ${schedule.recipients.length} recipient${schedule.recipients.length === 1 ? "" : "s"}`
            : " · no recipients"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={schedule.isActive}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          aria-label={schedule.isActive ? "Pause schedule" : "Resume schedule"}
          data-testid={`report-schedule-row-${schedule.id}-toggle`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(schedule)}
          data-testid={`report-schedule-row-${schedule.id}-edit`}
        >
          <Edit3 aria-hidden className="size-4" />
          <span>Edit</span>
        </Button>
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-status-danger-foreground hover:text-status-danger-foreground"
              data-testid={`report-schedule-row-${schedule.id}-delete`}
            >
              <Trash2 aria-hidden className="size-4" />
              <span>Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
              <AlertDialogDescription>
                Removes the config and every past execution record tied to it. Cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                data-testid={`report-schedule-row-${schedule.id}-delete-confirm`}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

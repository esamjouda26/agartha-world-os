"use client";

import * as React from "react";
import { Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { saveScheduleAction } from "@/features/reports/actions/save-schedule";
import { DateRangePicker } from "@/features/reports/components/date-range-picker";
import { REPORT_LABEL, type ReportType } from "@/features/reports/constants";
import type { SavedReport } from "@/features/reports/queries/list-reports";
import type { ReportParameters } from "@/features/reports/schemas/report";

export type ScheduleFormProps = Readonly<{
  /** When present, edit an existing schedule. Otherwise create new. */
  initial?: SavedReport;
  allowedReportTypes: readonly ReportType[];
  onComplete?: () => void;
  onCancel?: () => void;
}>;

const DEFAULT_PARAMS: ReportParameters = {
  date_range: { preset: "last_30_days", from: null, to: null },
  extras: {},
};

function coerceParameters(raw: Record<string, unknown>): ReportParameters {
  const dr = (raw.date_range ?? {}) as Record<string, unknown>;
  const preset =
    typeof dr.preset === "string" &&
    (["today", "last_7_days", "last_30_days", "custom"] as const).includes(dr.preset as never)
      ? (dr.preset as ReportParameters["date_range"]["preset"])
      : "last_30_days";
  const from = typeof dr.from === "string" ? dr.from : null;
  const to = typeof dr.to === "string" ? dr.to : null;
  const extras = (raw.extras ?? {}) as Record<string, unknown>;
  return { date_range: { preset, from, to }, extras };
}

export function ScheduleForm({
  initial,
  allowedReportTypes,
  onComplete,
  onCancel,
}: ScheduleFormProps) {
  const isEdit = Boolean(initial);
  const [reportType, setReportType] = React.useState<ReportType | null>(
    initial?.reportType ?? null,
  );
  const [params, setParams] = React.useState<ReportParameters>(
    initial ? coerceParameters(initial.parameters) : DEFAULT_PARAMS,
  );
  const [cron, setCron] = React.useState(initial?.scheduleCron ?? "0 6 * * 1");
  const [recipientsInput, setRecipientsInput] = React.useState(
    initial ? initial.recipients.join(", ") : "",
  );
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
  const [isPending, startTransition] = React.useTransition();

  const handleSave = () => {
    if (!reportType) {
      toastError("VALIDATION_FAILED");
      return;
    }
    const recipients = recipientsInput
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await saveScheduleAction({
        id: initial?.id ?? null,
        reportType,
        parameters: params,
        scheduleCron: cron,
        recipients,
        isActive,
      });
      if (result.success) {
        toastSuccess(isEdit ? "Schedule updated" : "Schedule saved");
        onComplete?.();
      } else {
        toastError(result);
      }
    });
  };

  return (
    <Card data-testid="report-schedule-form">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit schedule" : "New schedule"}</CardTitle>
        <CardDescription>
          Saved schedules run automatically via pg_cron and email recipients the download link when
          the report completes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-form-type">Report type</Label>
          <SearchableSelect
            id="schedule-form-type"
            value={reportType}
            onChange={(v) => setReportType(v as ReportType | null)}
            options={allowedReportTypes.map((t) => ({ value: t, label: REPORT_LABEL[t] }))}
            placeholder="Pick a report"
            searchPlaceholder="Search reports…"
            emptyLabel="No matching reports."
            disabled={allowedReportTypes.length === 0}
            data-testid="schedule-form-type-select"
          />
        </div>

        <DateRangePicker
          value={params.date_range}
          onChange={(next) => setParams((p) => ({ ...p, date_range: next }))}
          idPrefix="schedule-form-range"
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-form-cron">Cron expression</Label>
          <Input
            id="schedule-form-cron"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="0 6 * * 1  (every Monday at 06:00)"
            data-testid="schedule-form-cron"
          />
          <p className="text-foreground-muted text-xs">
            Standard 5-field cron: <code>minute hour day month weekday</code>.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-form-recipients">Recipients (emails)</Label>
          <Input
            id="schedule-form-recipients"
            value={recipientsInput}
            onChange={(e) => setRecipientsInput(e.target.value)}
            placeholder="alex@parkops.com, lee@parkops.com"
            data-testid="schedule-form-recipients"
          />
          <p className="text-foreground-muted text-xs">
            Comma- or space-separated. Up to 20 addresses.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label htmlFor="schedule-form-active">Active</Label>
            <p className="text-foreground-muted text-xs">
              Off pauses the schedule without deleting it.
            </p>
          </div>
          <Switch
            id="schedule-form-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            data-testid="schedule-form-active"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isPending}
              data-testid="schedule-form-cancel"
            >
              <X aria-hidden className="size-4" />
              <span>Cancel</span>
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="lg"
            onClick={handleSave}
            disabled={isPending || !reportType}
            aria-busy={isPending || undefined}
            data-testid="schedule-form-save"
          >
            <Save aria-hidden className="size-4" />
            <span>{isPending ? "Saving…" : isEdit ? "Save changes" : "Save schedule"}</span>
          </Button>
        </div>

        {isEdit ? (
          <p className="text-foreground-subtle border-border-subtle border-t pt-3 text-xs">
            <Trash2 aria-hidden className="mr-1 inline size-3" />
            To permanently remove this schedule, use the Delete button on its row in the list above.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

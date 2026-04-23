"use client";

import * as React from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toastError, toastInfo, toastSuccess } from "@/components/ui/toast-helpers";

import { generateReportNowAction } from "@/features/reports/actions/generate-report-now";
import { DateRangePicker } from "@/features/reports/components/date-range-picker";
import { REPORT_LABEL, type ReportType } from "@/features/reports/constants";
import type { ReportParameters } from "@/features/reports/schemas/report";

export type ReportGeneratorProps = Readonly<{
  allowedReportTypes: readonly ReportType[];
}>;

const DEFAULT_PARAMS: ReportParameters = {
  date_range: { preset: "last_7_days", from: null, to: null },
  extras: {},
};

/**
 * Ad-hoc "generate now" card. Picks a report type + date range, calls
 * the Server Action which invokes the `generate-report` Edge Function.
 *
 * On success, the Edge Function's returned signed file URL is surfaced
 * via a toast action so the user can download immediately, AND the
 * execution row lands in the history table below.
 */
export function ReportGenerator({ allowedReportTypes }: ReportGeneratorProps) {
  const [reportType, setReportType] = React.useState<ReportType | null>(null);
  const [params, setParams] = React.useState<ReportParameters>(DEFAULT_PARAMS);
  const [isPending, startTransition] = React.useTransition();

  const handleRun = () => {
    if (!reportType) {
      toastError("VALIDATION_FAILED");
      return;
    }
    startTransition(async () => {
      toastInfo("Generating report…", {
        description: "This can take up to 30 seconds for large data sets.",
      });
      const result = await generateReportNowAction({ reportType, parameters: params });
      if (result.success) {
        toastSuccess(
          result.data.rowCount === null
            ? "Report generated"
            : `Report generated — ${result.data.rowCount} row${result.data.rowCount === 1 ? "" : "s"}`,
          {
            description: result.data.fileUrl
              ? "Scroll down to the execution history to download."
              : "Scroll down to the execution history.",
          },
        );
      } else {
        toastError(result);
      }
    });
  };

  return (
    <Card data-testid="report-generator">
      <CardHeader>
        <CardTitle>Generate now</CardTitle>
        <CardDescription>
          Pick a report type and date range. One-off runs appear in the execution history below and
          can be downloaded for up to 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-generator-type">Report type</Label>
          <SearchableSelect
            id="report-generator-type"
            value={reportType}
            onChange={(v) => setReportType(v as ReportType | null)}
            options={allowedReportTypes.map((t) => ({ value: t, label: REPORT_LABEL[t] }))}
            placeholder={
              allowedReportTypes.length === 0
                ? "No report types available for your domains"
                : "Pick a report"
            }
            searchPlaceholder="Search reports…"
            emptyLabel="No matching reports."
            disabled={allowedReportTypes.length === 0}
            data-testid="report-generator-type-select"
          />
        </div>

        <DateRangePicker
          value={params.date_range}
          onChange={(next) => setParams((p) => ({ ...p, date_range: next }))}
          idPrefix="report-generator-range"
        />

        <div className="flex justify-end">
          <Button
            type="button"
            size="lg"
            onClick={handleRun}
            disabled={isPending || !reportType || allowedReportTypes.length === 0}
            aria-busy={isPending || undefined}
            data-testid="report-generator-run"
          >
            <Play aria-hidden className="size-4" />
            <span>{isPending ? "Generating…" : "Generate"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

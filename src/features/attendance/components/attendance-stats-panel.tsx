"use client";

import { format, parseISO } from "date-fns";

import { DailyPunchLog } from "@/features/attendance/components/daily-punch-log";
import { MonthPicker } from "@/features/attendance/components/month-picker";
import type { MonthlyPunchesByDay } from "@/features/attendance/queries/get-monthly-punches";
import type { MonthlyStats, WeeklyBreakdownRow } from "@/features/attendance/types";

type Props = Readonly<{
  stats: MonthlyStats;
  punches: ReadonlyArray<MonthlyPunchesByDay>;
}>;

/**
 * Tab-3 "My Attendance" surface — redesigned per DingTalk-style personal
 * stats panels. Layout:
 *   - Month picker (segmented prev/next) at the top right.
 *   - One-paragraph natural-language summary at the top, generated from
 *     the numbers. Paragraphs communicate better than KPI grids for
 *     personal stats.
 *   - A compact 4-KPI row with the inputs that justify the paragraph.
 *   - Weekly trend as a CSS horizontal bar chart — hours worked per week,
 *     with a tiny late-minutes marker on the right. No chart library;
 *     the primitive renders from `div` widths so it's CLS-safe and
 *     reduced-motion-friendly.
 */
export function AttendanceStatsPanel({ stats, punches }: Props) {
  return (
    <div className="flex flex-col gap-5" data-testid="attendance-stats-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          {format(parseISO(stats.month_start), "LLLL yyyy")}
        </h2>
        <MonthPicker />
      </div>

      <SummaryParagraph stats={stats} />

      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        data-testid="attendance-stats-kpis"
      >
        <StatCell label="Days worked" value={String(stats.days_worked)} />
        <StatCell label="Net hours" value={stats.net_hours.toFixed(1)} />
        <StatCell
          label="Late minutes"
          value={String(stats.late_minutes)}
          tone={stats.late_minutes > 0 ? "warning" : "neutral"}
          data-testid="attendance-stats-late-minutes"
        />
        <StatCell
          label="Unjustified"
          value={String(stats.unjustified_exception_count)}
          tone={stats.unjustified_exception_count > 0 ? "danger" : "success"}
          data-testid="attendance-stats-unjustified"
        />
      </section>

      <WeeklyTrend rows={stats.weekly_breakdown} />

      <DailyPunchLog days={punches} />
    </div>
  );
}

function SummaryParagraph({ stats }: Readonly<{ stats: MonthlyStats }>) {
  const hasShifts = stats.days_worked + stats.days_absent + stats.days_on_leave > 0;
  if (!hasShifts) {
    return (
      <p
        className="bg-surface border-border-subtle text-foreground-muted rounded-lg border p-4 text-sm"
        data-testid="attendance-stats-summary-empty"
      >
        No shifts recorded for this month yet. Clock-in history will surface here once your shift
        pattern starts.
      </p>
    );
  }

  const parts: string[] = [];
  parts.push(
    `You worked ${stats.days_worked} ${pluralize(stats.days_worked, "day", "days")} this month across ${stats.net_hours.toFixed(1)} net hours.`,
  );
  if (stats.days_absent > 0) {
    parts.push(
      `${stats.days_absent} ${pluralize(stats.days_absent, "day was", "days were")} logged as absent.`,
    );
  }
  if (stats.days_on_leave > 0) {
    parts.push(
      `${stats.days_on_leave} ${pluralize(stats.days_on_leave, "day", "days")} on approved leave.`,
    );
  }
  if (stats.late_minutes > 0) {
    parts.push(
      `Late arrivals totaling ${stats.late_minutes} ${pluralize(stats.late_minutes, "minute", "minutes")}.`,
    );
  }
  if (stats.early_departure_minutes > 0) {
    parts.push(
      `Early departures totaling ${stats.early_departure_minutes} ${pluralize(stats.early_departure_minutes, "minute", "minutes")}.`,
    );
  }
  if (stats.unjustified_exception_count > 0) {
    parts.push(
      `${stats.unjustified_exception_count} ${pluralize(stats.unjustified_exception_count, "exception is", "exceptions are")} still waiting on your clarification.`,
    );
  }

  return (
    <p
      className="bg-surface border-border-subtle text-foreground rounded-lg border p-4 text-sm leading-relaxed"
      data-testid="attendance-stats-summary"
    >
      {parts.join(" ")}
    </p>
  );
}

type Tone = "neutral" | "warning" | "danger" | "success";

function StatCell({
  label,
  value,
  tone = "neutral",
  "data-testid": testId,
}: Readonly<{
  label: string;
  value: string;
  tone?: Tone;
  "data-testid"?: string;
}>) {
  const valueClass =
    tone === "warning"
      ? "text-status-warning-foreground"
      : tone === "danger"
        ? "text-status-danger-foreground"
        : tone === "success"
          ? "text-status-success-foreground"
          : "text-foreground";
  return (
    <div
      className="border-border bg-card flex flex-col gap-1 rounded-md border p-3"
      data-testid={testId}
    >
      <p className="text-foreground-subtle text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className={`text-xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function WeeklyTrend({ rows }: Readonly<{ rows: ReadonlyArray<WeeklyBreakdownRow> }>) {
  if (rows.length === 0) return null;
  const maxHours = Math.max(1, ...rows.map((row) => row.gross_hours));

  return (
    <section
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
      data-testid="attendance-stats-weekly"
    >
      <h3 className="text-foreground text-sm font-semibold tracking-tight">Weekly breakdown</h3>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const widthPct = Math.round((row.gross_hours / maxHours) * 100);
          return (
            <li key={row.week_start} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground-muted tabular-nums">
                  {format(parseISO(row.week_start), "MMM d")} –{" "}
                  {format(parseISO(row.week_end), "MMM d")}
                </span>
                <span className="text-foreground-muted tabular-nums">
                  {row.gross_hours.toFixed(1)}h
                  {row.late_minutes > 0 ? (
                    <span className="text-status-warning-foreground ml-2 text-[11px] font-medium">
                      +{row.late_minutes}m late
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="bg-surface relative h-2 overflow-hidden rounded-full">
                <div
                  aria-hidden
                  className="bg-brand-primary absolute inset-y-0 left-0"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

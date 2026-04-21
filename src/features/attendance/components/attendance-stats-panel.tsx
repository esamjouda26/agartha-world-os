"use client";

import { format } from "date-fns";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { parseIsoDateLocal } from "@/lib/date";
import { MonthPicker } from "@/features/attendance/components/month-picker";
import type { MonthlyStats, WeeklyBreakdownRow } from "@/features/attendance/types";

type Props = Readonly<{
  stats: MonthlyStats;
}>;

/**
 * Tab-3 "Stats" surface — a month at a glance, nothing more. Layout:
 *   - Month picker + month title on top.
 *   - One-paragraph natural-language summary — faster to read than grids.
 *   - KPI card row (KpiCard primitive) — accent emphasis on the two
 *     metrics that demand user action when non-zero.
 *   - Weekly trend as a CSS bar chart (no chart library).
 *
 * The day-by-day punch log that used to live below the weekly trend
 * was dropped — users browse day-specific punches on the Clock tab
 * via the date picker instead, so listing them here was redundant.
 */
export function AttendanceStatsPanel({ stats }: Props) {
  return (
    <div className="flex flex-col gap-6" data-testid="attendance-stats-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {format(parseIsoDateLocal(stats.month_start), "LLLL yyyy")}
        </h2>
        <MonthPicker />
      </div>

      <SummaryParagraph stats={stats} />

      <KpiCardRow data-testid="attendance-stats-kpis">
        <KpiCard label="Days worked" value={stats.days_worked} caption="this month" />
        <KpiCard label="Net hours" value={stats.net_hours.toFixed(1)} caption="payable" />
        <KpiCard
          label="Late minutes"
          value={stats.late_minutes}
          caption={stats.late_minutes > 0 ? "attention" : "on time"}
          emphasis={stats.late_minutes > 0 ? "accent" : "default"}
          data-testid="attendance-stats-late-minutes"
        />
        <KpiCard
          label="Unjustified"
          value={stats.unjustified_exception_count}
          caption={stats.unjustified_exception_count > 0 ? "needs clarification" : "all clarified"}
          emphasis={stats.unjustified_exception_count > 0 ? "accent" : "default"}
          data-testid="attendance-stats-unjustified"
        />
      </KpiCardRow>

      <WeeklyTrend rows={stats.weekly_breakdown} />
    </div>
  );
}

function SummaryParagraph({ stats }: Readonly<{ stats: MonthlyStats }>) {
  const hasShifts = stats.days_worked + stats.days_absent + stats.days_on_leave > 0;
  if (!hasShifts) {
    return (
      <p
        className="bg-surface border-border-subtle text-foreground-muted rounded-xl border p-4 text-sm"
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
      className="bg-surface border-border-subtle text-foreground rounded-xl border p-4 text-sm leading-relaxed"
      data-testid="attendance-stats-summary"
    >
      {parts.join(" ")}
    </p>
  );
}

function WeeklyTrend({ rows }: Readonly<{ rows: ReadonlyArray<WeeklyBreakdownRow> }>) {
  if (rows.length === 0) return null;
  const maxHours = Math.max(1, ...rows.map((row) => row.gross_hours));

  return (
    <section
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-xs"
      data-testid="attendance-stats-weekly"
    >
      <h3 className="text-foreground text-sm font-semibold tracking-tight">Weekly breakdown</h3>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const widthPct = Math.round((row.gross_hours / maxHours) * 100);
          return (
            <li key={row.week_start} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground-muted tabular-nums">
                  {format(parseIsoDateLocal(row.week_start), "MMM d")} –{" "}
                  {format(parseIsoDateLocal(row.week_end), "MMM d")}
                </span>
                <span className="text-foreground-muted tabular-nums">
                  <span className="text-foreground font-semibold">
                    {row.gross_hours.toFixed(1)}h
                  </span>
                  {row.late_minutes > 0 ? (
                    <span className="text-status-warning-foreground ml-2 text-[11px] font-medium">
                      +{row.late_minutes}m late
                    </span>
                  ) : null}
                </span>
              </div>
              {/* Gradient-filled bar so a full week doesn't look flat. */}
              <div className="bg-surface border-border-subtle relative h-2 overflow-hidden rounded-full border">
                <div
                  aria-hidden
                  className="from-brand-primary to-brand-primary/70 absolute inset-y-0 left-0 rounded-full bg-gradient-to-r"
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

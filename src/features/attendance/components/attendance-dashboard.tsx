"use client";

import { useCallback } from "react";
import { AlertCircle, ArrowRight, BarChart3, Clock } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { format } from "date-fns";

import { KpiCard } from "@/components/ui/kpi-card";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { monthStartIsoLocal, parseIsoDateLocal } from "@/lib/date";
import { cn } from "@/lib/utils";
import { AttendanceStatsPanel } from "@/features/attendance/components/attendance-stats-panel";
import { ClockInOutPanel } from "@/features/attendance/components/clock-in-out-panel";
import { ExceptionList } from "@/features/attendance/components/exception-list";
import { MonthlyAttendanceCalendar } from "@/features/attendance/components/monthly-attendance-calendar";
import { displayShiftName, displayShiftWindow } from "@/features/attendance/utils/shift-display";
import type { MonthlyPunchesByDay } from "@/features/attendance/queries/get-monthly-punches";
import type { ExceptionRow, MonthlyStats, TodayShift } from "@/features/attendance/types";

type Props = Readonly<{
  displayName: string;
  canWrite: boolean;
  staffRecordId: string;
  shift: TodayShift | null;
  todayIso: string;
  selectedDateIso: string;
  exceptions: ReadonlyArray<ExceptionRow>;
  stats: MonthlyStats;
  punches: ReadonlyArray<MonthlyPunchesByDay>;
}>;

const TABS = ["clock", "exceptions", "stats"] as const;
type TabValue = (typeof TABS)[number];

/**
 * AttendanceDashboard — the responsive layout orchestrator.
 *
 * Mobile / tablet (< lg): a single-column stack. Sticky `StatusTabBar`
 * at the top keeps section switching in the thumb reach.
 *
 * Desktop (≥ lg): 12-column grid. The active tab renders in cols 1–7
 * (xl: 1–8); the OTHER two tabs render as live preview cards in cols
 * 8–12 (xl: 9–12). Clicking a preview promotes it to active via the
 * same nuqs URL contract, so deep-links + back/forward history still
 * work identically to the single-tab view.
 *
 * This preserves the frontend_spec.md §6 "3-tab layout" semantic (URL,
 * role=tabpanel, single active selection in aria) while using the wide
 * canvas for at-a-glance awareness the way a dashboard actually should.
 */
export function AttendanceDashboard({
  canWrite,
  staffRecordId,
  shift,
  todayIso,
  selectedDateIso,
  exceptions,
  stats,
  punches,
}: Props) {
  const [active, setActive] = useQueryState(
    "tab",
    parseAsString.withDefault("clock").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const [, setDate] = useQueryState(
    "date",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );
  const [, setMonth] = useQueryState(
    "month",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );

  const current: TabValue = (TABS as readonly string[]).includes(active)
    ? (active as TabValue)
    : "clock";

  const unjustifiedCount = exceptions.filter((row) => row.status === "unjustified").length;

  const onTabChange = useCallback(
    (next: string) => {
      void setActive(next);
      // Clear other-tab params so the URL reflects only the active tab's scope.
      if (next !== "clock") void setDate(null);
      if (next !== "stats") void setMonth(null);
    },
    [setActive, setDate, setMonth],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="attendance-tabs">
      {/* Prominent tab bar. Sticks to the portal shell's top offset on
          mobile so it remains reachable as the user scrolls. The
          `-mx-4 px-4` recipe lets the frosted backdrop span full width
          even when the parent has horizontal padding. */}
      <div className="sticky top-[60px] z-20 -mx-4 bg-[color:var(--frost-bg-md)] px-4 py-2 [backdrop-filter:var(--frost-blur-md)] lg:static lg:z-auto lg:mx-0 lg:bg-transparent lg:p-0 lg:[backdrop-filter:none]">
        <StatusTabBar
          tabs={[
            { value: "clock", label: "Today" },
            {
              value: "exceptions",
              label: "Exceptions",
              count: exceptions.length,
              ...(unjustifiedCount > 0 ? ({ tone: "warning" } as const) : {}),
            },
            { value: "stats", label: "Stats" },
          ]}
          paramKey="tab"
          ariaLabel="Attendance sections"
          panelIdPrefix="attendance-tab"
          data-testid="attendance-tabbar"
          onValueChange={onTabChange}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <main
          role="tabpanel"
          id={`attendance-tab-${current}`}
          aria-labelledby={`tab-tab-${current}`}
          data-testid={`attendance-panel-${current}`}
          className="flex min-w-0 flex-col gap-6 lg:col-span-7 xl:col-span-8"
        >
          {current === "clock" ? (
            <>
              <ClockInOutPanel
                shift={shift}
                todayIso={todayIso}
                selectedDateIso={selectedDateIso}
              />
              {/* Mobile-only action strip. Two cards only — the two
                  signals that can prompt the user to switch tabs.
                  Historical detail (days worked / late min / net hours)
                  lives in the Stats tab and doesn't belong above the
                  fold on the Clock tab. */}
              <section
                className="grid grid-cols-2 gap-3 lg:hidden"
                data-testid="attendance-mobile-kpi-strip"
                aria-label="Attendance at a glance"
              >
                <KpiCard
                  label="Status"
                  value={resolveClockMetric(shift, canWrite)}
                  density="compact"
                  data-testid="attendance-mobile-kpi-status"
                />
                <KpiCard
                  label="Unjustified"
                  value={unjustifiedCount}
                  caption={unjustifiedCount > 0 ? "needs action" : "all clear"}
                  density="compact"
                  emphasis={unjustifiedCount > 0 ? "accent" : "default"}
                  data-testid="attendance-mobile-kpi-unjustified"
                />
              </section>
            </>
          ) : null}
          {current === "exceptions" ? (
            <ExceptionList rows={exceptions} staffRecordId={staffRecordId} />
          ) : null}
          {current === "stats" ? <AttendanceStatsPanel stats={stats} /> : null}
        </main>

        {/* At-a-glance aside — only on lg+. Preview cards for the two
            tabs not currently active. Each card click promotes itself
            to the active tab via the same nuqs contract. */}
        <aside
          aria-label="At a glance"
          className="hidden flex-col gap-3 lg:col-span-5 lg:flex xl:col-span-4"
          data-testid="attendance-preview-rail"
        >
          {current !== "clock" ? (
            <AttendancePreview
              eyebrow="Today"
              title={shift ? displayShiftName(shift.shiftType.name) : "No shift today"}
              metric={resolveClockMetric(shift, canWrite)}
              detail={shift ? (displayShiftWindow(shift) ?? undefined) : "Nothing to clock into"}
              tone={resolveClockTone(shift)}
              icon={<Clock className="size-4" aria-hidden />}
              onClick={() => onTabChange("clock")}
              testId="attendance-preview-clock"
            />
          ) : null}
          {current !== "exceptions" ? (
            <AttendancePreview
              eyebrow="Exceptions"
              title={unjustifiedCount > 0 ? "Needs your clarification" : "All caught up"}
              metric={`${exceptions.length}`}
              detail={
                unjustifiedCount > 0
                  ? `${unjustifiedCount} unjustified`
                  : exceptions.length === 0
                    ? "No open items"
                    : "All clarified"
              }
              tone={unjustifiedCount > 0 ? "warning" : "success"}
              icon={<AlertCircle className="size-4" aria-hidden />}
              onClick={() => onTabChange("exceptions")}
              testId="attendance-preview-exceptions"
            />
          ) : null}
          {current !== "stats" ? (
            <AttendancePreview
              eyebrow="Stats"
              title={format(parseIsoDateLocal(stats.month_start), "LLLL yyyy")}
              metric={`${stats.days_worked} days`}
              detail={`${stats.net_hours.toFixed(1)} net hours · ${stats.late_minutes} late min`}
              tone={stats.unjustified_exception_count > 0 ? "warning" : "neutral"}
              icon={<BarChart3 className="size-4" aria-hidden />}
              onClick={() => onTabChange("stats")}
              testId="attendance-preview-stats"
            />
          ) : null}

          {/* Monthly attendance calendar. Always visible in the aside so
              the at-a-glance view is available regardless of the active
              tab. Clicking a day navigates via `?date=`. */}
          <MonthlyAttendanceCalendar
            monthIso={monthStartIsoLocal(stats.month_start)}
            todayIso={todayIso}
            selectedDateIso={selectedDateIso}
            punches={punches}
          />
        </aside>
      </div>
    </div>
  );
}

type PreviewTone = "neutral" | "success" | "warning";

type AttendancePreviewProps = Readonly<{
  eyebrow: string;
  title: string;
  metric: string;
  detail?: string | undefined;
  tone?: PreviewTone;
  icon?: React.ReactNode;
  onClick: () => void;
  testId: string;
}>;

/** At-a-glance tile rendered in the desktop aside. Clicking promotes the
 *  corresponding tab to active without a page navigation (nuqs shallow).
 *  Keyboard Enter/Space already handled by the native `<button>`. */
function AttendancePreview({
  eyebrow,
  title,
  metric,
  detail,
  tone = "neutral",
  icon,
  onClick,
  testId,
}: AttendancePreviewProps) {
  const metricClass =
    tone === "warning"
      ? "text-status-warning-foreground"
      : tone === "success"
        ? "text-status-success-foreground"
        : "text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "group/preview bg-card border-border rounded-xl border p-4 text-left shadow-xs",
        "focus-visible:outline-ring transition-[transform,box-shadow,border-color] duration-[var(--duration-layout)] [transition-timing-function:var(--ease-standard)] outline-none",
        "hover:border-brand-primary/30 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
            {eyebrow}
          </p>
          <p className="text-foreground mt-1 truncate text-sm font-medium">{title}</p>
        </div>
        {icon ? (
          <span className="text-foreground-subtle group-hover/preview:text-brand-primary transition-colors">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", metricClass)}>
            {metric}
          </p>
          {detail ? (
            <p className="text-foreground-muted mt-0.5 truncate text-xs">{detail}</p>
          ) : null}
        </div>
        <ArrowRight
          aria-hidden
          className="text-foreground-subtle size-4 shrink-0 transition-transform group-hover/preview:translate-x-0.5"
        />
      </div>
    </button>
  );
}

function resolveClockMetric(shift: TodayShift | null, canWrite: boolean): string {
  if (!shift) return "—";
  const hasIn = shift.punches.some((p) => p.punch_type === "clock_in");
  const hasOut = shift.punches.some((p) => p.punch_type === "clock_out");
  if (hasIn && hasOut) return "Shift complete";
  if (hasIn) return "On shift";
  return canWrite ? "Not clocked in" : "Read only";
}

function resolveClockTone(shift: TodayShift | null): PreviewTone {
  if (!shift) return "neutral";
  const hasIn = shift.punches.some((p) => p.punch_type === "clock_in");
  const hasOut = shift.punches.some((p) => p.punch_type === "clock_out");
  if (hasIn && hasOut) return "success";
  if (hasIn) return "success";
  return "neutral";
}

"use client";

import { useCallback } from "react";
import { parseAsString, useQueryState } from "nuqs";

import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { AttendanceStatsPanel } from "@/features/attendance/components/attendance-stats-panel";
import { ClockInOutPanel } from "@/features/attendance/components/clock-in-out-panel";
import { ExceptionList } from "@/features/attendance/components/exception-list";
import type { MonthlyPunchesByDay } from "@/features/attendance/queries/get-monthly-punches";
import type { ExceptionRow, MonthlyStats, TodayShift } from "@/features/attendance/types";

type Props = Readonly<{
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
 * AttendanceTabs — owns the `?tab=` URL param + clears other tabs'
 * scoped params on switch so stale `?date=` / `?month=` don't leak into
 * an unrelated panel's request. Each tab pairs with its own param:
 *   - clock      → `?date=YYYY-MM-DD`
 *   - exceptions → (none)
 *   - stats      → `?month=YYYY-MM-DD`
 *
 * Without this cleanup the RSC would fetch both even when only one is in
 * view — wasted work and a confusing URL. Clearing them on tab change
 * keeps each tab's state self-contained while retaining deep-linkability
 * (a direct URL with `?tab=stats&month=...` still works).
 */
export function AttendanceTabs({
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
      // Clear other-tab params so the URL reflects only the active tab's
      // scope. `shallow: false` on setDate/setMonth triggers a single
      // server round-trip; running them in sequence with setActive keeps
      // navigation snappy (nuqs batches within a tick).
      if (next !== "clock") void setDate(null);
      if (next !== "stats") void setMonth(null);
    },
    [setActive, setDate, setMonth],
  );

  return (
    <div className="flex flex-col gap-5" data-testid="attendance-tabs">
      <StatusTabBar
        ariaLabel="Attendance tabs"
        paramKey="tab"
        panelIdPrefix="attendance-tab"
        tabs={[
          { value: "clock", label: "Clock In/Out" },
          {
            value: "exceptions",
            label: "My Exceptions",
            count: exceptions.length,
            ...(unjustifiedCount > 0 ? ({ tone: "warning" } as const) : {}),
          },
          { value: "stats", label: "My Attendance" },
        ]}
        data-testid="attendance-tabbar"
        onValueChange={onTabChange}
      />
      <div
        role="tabpanel"
        id={`attendance-tab-${current}`}
        aria-labelledby={`tab-tab-${current}`}
        data-testid={`attendance-panel-${current}`}
      >
        {current === "clock" ? (
          <ClockInOutPanel shift={shift} todayIso={todayIso} selectedDateIso={selectedDateIso} />
        ) : null}
        {current === "exceptions" ? <ExceptionList rows={exceptions} /> : null}
        {current === "stats" ? <AttendanceStatsPanel stats={stats} punches={punches} /> : null}
      </div>
    </div>
  );
}

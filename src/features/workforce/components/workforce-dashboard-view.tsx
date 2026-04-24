"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { Users, UserPlus, UserMinus, CalendarOff, Activity, Clock } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarList } from "@/components/ui/bar-list-item";
import { GaugeRing } from "@/components/ui/gauge-ring";

import type { WorkforceDashboardData } from "@/features/workforce/queries/get-workforce-dashboard";

const ACCESS_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  crew: "Crew",
};

type WorkforceDashboardViewProps = Readonly<{ data: WorkforceDashboardData }>;

export function WorkforceDashboardView({ data }: WorkforceDashboardViewProps) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringEnum(["7d", "30d"]).withOptions({
      clearOnDefault: true,
      history: "push",
      shallow: false,
    }),
  );
  const activeRange = range ?? "30d";

  const attendanceSeries = data.attendanceTrend.map((d) => d.ratePct);

  return (
    <div className="flex flex-col gap-6" data-testid="workforce-dashboard">
      <PageHeader
        title="Workforce"
        description="Headcount, attendance compliance, leave utilisation, and department distribution."
        eyebrow="BUSINESS · WORKFORCE"
        metaSlot={
          <div className="flex gap-2" role="group">
            {(["7d", "30d"] as const).map((r) => {
              const active = activeRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => void setRange(r === "30d" ? null : r)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-border-subtle text-foreground-subtle hover:border-border hover:text-foreground",
                  ].join(" ")}
                  aria-pressed={active}
                  data-testid={`workforce-range-${r}`}
                >
                  {r === "7d" ? "7 days" : "30 days"}
                </button>
              );
            })}
          </div>
        }
      />

      {/* ── Headcount KPIs ─────────────────────────────────────────────── */}
      <KpiCardRow data-testid="workforce-kpis">
        <KpiCard
          label="Active Staff"
          value={data.totalActive}
          icon={<Users className="size-4" />}
          emphasis="accent"
          data-testid="workforce-kpi-active"
        />
        <KpiCard
          label="New Hires"
          value={data.newHires}
          caption={`${data.periodFrom} – ${data.periodTo}`}
          icon={<UserPlus className="size-4" />}
          data-testid="workforce-kpi-new-hires"
        />
        <KpiCard
          label="Departures"
          value={data.departures}
          caption={`${data.periodFrom} – ${data.periodTo}`}
          icon={<UserMinus className="size-4" />}
          emphasis={data.departures > 0 ? "accent" : "default"}
          data-testid="workforce-kpi-departures"
        />
        <KpiCard
          label="Currently on Leave"
          value={data.onLeave}
          icon={<CalendarOff className="size-4" />}
          data-testid="workforce-kpi-on-leave"
        />
      </KpiCardRow>

      {/* ── Access level breakdown ─────────────────────────────────────── */}
      <SectionCard
        title="Staff by Access Level"
        description="Active headcount broken down by role type."
        data-testid="access-level-breakdown"
      >
        <div className="flex flex-wrap gap-3">
          {data.byAccessLevel.map((item) => (
            <div
              key={item.accessLevel}
              className="border-border bg-surface flex flex-col items-center gap-1 rounded-xl border px-6 py-4 shadow-xs"
              data-testid={`access-level-${item.accessLevel}`}
            >
              <span className="text-foreground text-2xl font-bold tabular-nums">{item.count}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {ACCESS_LABELS[item.accessLevel] ?? item.accessLevel}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Attendance + Exceptions side by side ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Attendance Compliance"
          description="Daily attendance rate and exception breakdown."
          data-testid="attendance-compliance"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6">
              <GaugeRing
                value={data.attendanceRatePct ?? 0}
                size={80}
                tone={
                  data.attendanceRatePct != null && data.attendanceRatePct < 80
                    ? "warning"
                    : "success"
                }
                label={data.attendanceRatePct != null ? `${data.attendanceRatePct}%` : "—"}
                caption="rate"
                aria-label={`Attendance rate: ${data.attendanceRatePct ?? 0}%`}
                data-testid="workforce-gauge-attendance"
              />
              <KpiCard
                label="Attendance Rate"
                value={data.attendanceRatePct != null ? `${data.attendanceRatePct}%` : "—"}
                caption="present / scheduled"
                icon={<Activity className="size-4" />}
                emphasis={
                  data.attendanceRatePct != null && data.attendanceRatePct < 80
                    ? "accent"
                    : "default"
                }
                {...(attendanceSeries.length >= 2
                  ? {
                      sparkline: (
                        <Sparkline
                          data={attendanceSeries}
                          tone={
                            data.attendanceRatePct != null && data.attendanceRatePct < 80
                              ? "warning"
                              : "success"
                          }
                          label="Attendance trend"
                        />
                      ),
                    }
                  : {})}
                data-testid="workforce-kpi-attendance"
              />
            </div>

            <Separator />

            <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
              Unjustified Exceptions by Type
            </p>
            {data.exceptionsByType.length === 0 ? (
              <p className="text-foreground-muted text-sm">No unjustified exceptions in period.</p>
            ) : (
              <BarList
                tone="danger"
                items={data.exceptionsByType.map((item) => ({
                  rawValue: item.count,
                  value: String(item.count),
                  label: item.label,
                }))}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Exception Leaderboard"
          description="Top 5 staff with most unjustified exceptions this period."
          data-testid="exception-leaderboard"
        >
          {data.exceptionLeaderboard.length === 0 ? (
            <p className="text-foreground-muted py-4 text-center text-sm">
              No unjustified exceptions.
            </p>
          ) : (
            <ol className="flex flex-col gap-2" role="list">
              {data.exceptionLeaderboard.map((entry, idx) => (
                <li
                  key={entry.staffRecordId}
                  className="flex items-center gap-3"
                  data-testid={`exc-leader-${entry.staffRecordId}`}
                >
                  <span className="text-foreground-muted w-5 text-right text-sm tabular-nums">
                    {idx + 1}.
                  </span>
                  <span className="text-foreground flex-1 text-sm font-medium">
                    {entry.displayName}
                  </span>
                  <Badge variant="destructive" className="tabular-nums">
                    {entry.count}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* ── Leave utilisation + Departments ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Leave Utilisation"
          description="Accrued vs used days — current fiscal year."
          data-testid="leave-utilization"
        >
          <KpiCardRow>
            <KpiCard
              label="Avg Leave Utilisation"
              value={data.avgLeaveUtilPct != null ? `${data.avgLeaveUtilPct}%` : "—"}
              caption="used / accrued"
              icon={<Clock className="size-4" />}
              emphasis={
                data.avgLeaveUtilPct != null &&
                (data.avgLeaveUtilPct > 90 || data.avgLeaveUtilPct < 10)
                  ? "accent"
                  : "default"
              }
              data-testid="workforce-kpi-leave-util"
            />
            <KpiCard
              label="On Leave Now"
              value={data.onLeave}
              icon={<CalendarOff className="size-4" />}
              data-testid="workforce-kpi-on-leave-now"
            />
          </KpiCardRow>
        </SectionCard>

        <SectionCard
          title="Headcount by Department"
          description="Active staff distributed across top-level org units."
          data-testid="department-distribution"
        >
          {data.departmentDistribution.length === 0 ? (
            <p className="text-foreground-muted text-sm">No org units with staff.</p>
          ) : (
            <BarList
              items={data.departmentDistribution.map((dept) => ({
                rawValue: dept.staffCount,
                value: String(dept.staffCount),
                label: dept.orgUnitName,
              }))}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

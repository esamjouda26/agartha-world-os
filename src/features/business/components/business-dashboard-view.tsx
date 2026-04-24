"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useQueryState, parseAsStringEnum, parseAsBoolean } from "nuqs";
import {
  TrendingUp,
  BarChart3,
  ShoppingCart,
  Activity,
  Siren,
  Wrench,
  Star,
  MessageSquare,
  Users,
  AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { PeriodSelector } from "@/components/ui/period-selector";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { DataMetricGrid } from "@/components/ui/data-metric";
import type { DateRangeValue } from "@/components/ui/date-range-picker";

import type { BusinessDashboardData } from "@/features/business/types/business";

// ── Helpers ─────────────────────────────────────────────────────────────

const MYR = new Intl.NumberFormat("ms-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatMyr(value: number): string {
  return MYR.format(value);
}

function pctDelta(
  current: number,
  prior: number | null,
): { direction: "up" | "down" | "flat"; label: string } | null {
  if (prior === null || prior === 0) return null;
  const delta = ((current - prior) / prior) * 100;
  const direction = delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
  const sign = delta > 0 ? "+" : "";
  return { direction, label: `${sign}${delta.toFixed(1)}%` };
}

function occupancyPct(occ: number, cap: number): string {
  if (cap === 0) return "—";
  return `${Math.round((occ / cap) * 100)}%`;
}

// ── Component ────────────────────────────────────────────────────────────

type BusinessDashboardViewProps = Readonly<{ data: BusinessDashboardData }>;

export function BusinessDashboardView({ data }: BusinessDashboardViewProps) {
  const router = useRouter();

  // Period selector — URL state (shallow=false → triggers RSC refetch)
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringEnum(["today", "7d", "30d"]).withOptions({
      clearOnDefault: true,
      history: "push",
      shallow: false,
    }),
  );
  const [compare, setCompare] = useQueryState(
    "compare",
    parseAsBoolean.withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );

  // Derive DateRangeValue for PeriodSelector from URL or data
  const [customRange, setCustomRange] = React.useState<DateRangeValue | null>(null);

  const compareEnabled = compare === true;

  // Revenue trend sparkline data
  const posSeries = data.revenueTrend.map((p) => p.posRevenue);
  const bookingSeries = data.revenueTrend.map((p) => p.bookingRevenue);
  const combinedSeries = data.revenueTrend.map((p) => p.posRevenue + p.bookingRevenue);

  // Trends
  const totalTrend = pctDelta(data.totalRevenue, data.priorTotalRevenue);
  const posTrend = pctDelta(data.posRevenue, data.priorPosRevenue);
  const bookingTrend = pctDelta(data.bookingRevenue, data.priorBookingRevenue);
  const attendancePct =
    data.scheduledToday > 0 ? Math.round((data.presentToday / data.scheduledToday) * 100) : null;

  return (
    <div className="flex flex-col gap-6" data-testid="business-dashboard">
      {/* ── Header + Period Selector ─────────────────────────────────── */}
      <PageHeader
        title="Executive Dashboard"
        description="Cross-domain morning briefing — revenue, operations, guests, and workforce."
        eyebrow="BUSINESS · OVERVIEW"
        metaSlot={
          <PeriodSelector
            value={customRange}
            onChange={(v) => {
              setCustomRange(v);
              void setRange(null); // clear preset when using custom picker
            }}
            compareEnabled={compareEnabled}
            onCompareChange={(enabled) => void setCompare(enabled || null)}
            pickerProps={{
              "data-testid": "business-period-picker",
              placeholder:
                range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Today",
            }}
            data-testid="business-period-selector"
          />
        }
      />

      {/* Preset quick-range chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
        {(["today", "7d", "30d"] as const).map((r) => {
          const label = r === "today" ? "Today" : r === "7d" ? "Last 7 days" : "Last 30 days";
          const active = (range ?? "today") === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => void setRange(r === "today" ? null : r)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                  : "border-border-subtle text-foreground-subtle hover:border-border hover:text-foreground",
              ].join(" ")}
              aria-pressed={active}
              data-testid={`business-range-${r}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Revenue strip ───────────────────────────────────────────── */}
      <SectionCard
        title="Revenue"
        action={
          <button
            type="button"
            onClick={() => router.push("/admin/revenue")}
            className="text-brand-primary text-xs font-medium hover:underline"
            data-testid="business-revenue-link"
          >
            Deep dive →
          </button>
        }
        data-testid="business-revenue-strip"
      >
        <KpiCardRow>
          <KpiCard
            label="Total Revenue"
            value={formatMyr(data.totalRevenue)}
            caption={`${data.periodFrom} – ${data.periodTo}`}
            icon={<TrendingUp className="size-4" />}
            emphasis="accent"
            {...(combinedSeries.length >= 2
              ? {
                  sparkline: <Sparkline data={combinedSeries} tone="brand" label="Revenue trend" />,
                }
              : {})}
            {...(totalTrend
              ? {
                  trend: {
                    direction: totalTrend.direction,
                    label: totalTrend.label,
                    goodWhen: "up" as const,
                  },
                }
              : {})}
            data-testid="business-kpi-total-revenue"
          />
          <KpiCard
            label="POS Revenue"
            value={formatMyr(data.posRevenue)}
            icon={<ShoppingCart className="size-4" />}
            {...(posSeries.length >= 2
              ? { sparkline: <Sparkline data={posSeries} tone="neutral" /> }
              : {})}
            {...(posTrend
              ? {
                  trend: {
                    direction: posTrend.direction,
                    label: posTrend.label,
                    goodWhen: "up" as const,
                  },
                }
              : {})}
            data-testid="business-kpi-pos-revenue"
          />
          <KpiCard
            label="Booking Revenue"
            value={formatMyr(data.bookingRevenue)}
            icon={<BarChart3 className="size-4" />}
            {...(bookingSeries.length >= 2
              ? { sparkline: <Sparkline data={bookingSeries} tone="brand" /> }
              : {})}
            {...(bookingTrend
              ? {
                  trend: {
                    direction: bookingTrend.direction,
                    label: bookingTrend.label,
                    goodWhen: "up" as const,
                  },
                }
              : {})}
            data-testid="business-kpi-booking-revenue"
          />
        </KpiCardRow>
      </SectionCard>

      {/* ── Operations strip ─────────────────────────────────────────── */}
      <SectionCard
        title="Operations"
        action={
          <button
            type="button"
            onClick={() => router.push("/admin/operations")}
            className="text-brand-primary text-xs font-medium hover:underline"
            data-testid="business-operations-link"
          >
            Deep dive →
          </button>
        }
        data-testid="business-ops-strip"
      >
        <KpiCardRow>
          <KpiCard
            label="Facility Occupancy"
            value={occupancyPct(data.currentOccupancy, data.totalCapacity)}
            caption={`${data.currentOccupancy} / ${data.totalCapacity} capacity`}
            icon={<Activity className="size-4" />}
            data-testid="business-kpi-occupancy"
          />
          <KpiCard
            label="Open Incidents"
            value={data.openIncidents}
            icon={<Siren className="size-4" />}
            emphasis={data.openIncidents > 0 ? "accent" : "default"}
            data-testid="business-kpi-incidents"
          />
          <KpiCard
            label="Active Maintenance WOs"
            value={data.activeMaintenanceWOs}
            icon={<Wrench className="size-4" />}
            emphasis={data.activeMaintenanceWOs > 0 ? "accent" : "default"}
            data-testid="business-kpi-maintenance"
          />
        </KpiCardRow>
      </SectionCard>

      {/* ── Guest + Workforce — side by side on xl+ ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Guest strip */}
        <SectionCard
          title="Guest Satisfaction"
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/guests")}
              className="text-brand-primary text-xs font-medium hover:underline"
              data-testid="business-guests-link"
            >
              Deep dive →
            </button>
          }
          data-testid="business-guest-strip"
        >
          <KpiCardRow>
            <KpiCard
              label="NPS Score"
              value={
                data.npsScore != null ? `${data.npsScore > 0 ? "+" : ""}${data.npsScore}` : "—"
              }
              caption={data.surveyCount > 0 ? `${data.surveyCount} responses` : "No responses"}
              icon={<Star className="size-4" />}
              emphasis={data.npsScore != null && data.npsScore >= 50 ? "accent" : "default"}
              data-testid="business-kpi-nps"
            />
            <KpiCard
              label="Avg Visit Rating"
              value={data.avgVisitRating != null ? data.avgVisitRating.toFixed(1) : "—"}
              caption="out of 10"
              icon={<MessageSquare className="size-4" />}
              data-testid="business-kpi-avg-rating"
            />
          </KpiCardRow>
        </SectionCard>

        {/* Workforce strip */}
        <SectionCard
          title="Workforce"
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/workforce")}
              className="text-brand-primary text-xs font-medium hover:underline"
              data-testid="business-workforce-link"
            >
              Deep dive →
            </button>
          }
          data-testid="business-workforce-strip"
        >
          <KpiCardRow>
            <KpiCard
              label="Attendance Today"
              value={attendancePct != null ? `${attendancePct}%` : "—"}
              caption={`${data.presentToday} of ${data.scheduledToday} scheduled`}
              icon={<Users className="size-4" />}
              emphasis={attendancePct != null && attendancePct < 80 ? "accent" : "default"}
              data-testid="business-kpi-attendance"
            />
            <KpiCard
              label="Unjustified Exceptions"
              value={data.unjustifiedExceptionsThisWeek}
              caption="this week"
              icon={<AlertTriangle className="size-4" />}
              emphasis={data.unjustifiedExceptionsThisWeek > 0 ? "accent" : "default"}
              data-testid="business-kpi-exceptions"
            />
          </KpiCardRow>
        </SectionCard>
      </div>

      {/* ── Revenue trend chart ───────────────────────────────────────── */}
      {data.revenueTrend.length >= 2 && (
        <SectionCard
          title="Revenue Trend"
          description={`Daily combined revenue (POS + bookings) — ${data.periodFrom} to ${data.periodTo}`}
          data-testid="business-revenue-trend"
        >
          <div className="flex flex-col gap-3">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-brand-primary inline-block size-2.5 rounded-full" />
                <span className="text-foreground-subtle">Combined</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-status-neutral-solid inline-block size-2.5 rounded-full" />
                <span className="text-foreground-subtle">POS</span>
              </span>
              {data.hasComparison && (
                <Badge variant="outline" className="text-xs">
                  vs prior period
                </Badge>
              )}
            </div>

            {/* Sparkline — fills the full width */}
            <div className="h-28 w-full">
              <Sparkline
                data={combinedSeries}
                tone="brand"
                label={`Revenue trend ${data.periodFrom} to ${data.periodTo}`}
                width={800}
                height={112}
                className="w-full"
              />
            </div>

            {/* Day labels: first, middle, last */}
            {data.revenueTrend.length >= 3 && (
              <div className="text-foreground-muted flex justify-between font-mono text-xs">
                <span>{data.revenueTrend[0]?.date}</span>
                <span>{data.revenueTrend[Math.floor(data.revenueTrend.length / 2)]?.date}</span>
                <span>{data.revenueTrend[data.revenueTrend.length - 1]?.date}</span>
              </div>
            )}

            {/* Revenue summary */}
            <DataMetricGrid
              cols={3}
              dividers
              metrics={[
                {
                  label: "Total",
                  value: formatMyr(data.totalRevenue),
                  ...(totalTrend
                    ? {
                        trend: {
                          direction: totalTrend.direction,
                          label: totalTrend.label,
                          goodWhen: "up" as const,
                        },
                      }
                    : {}),
                },
                {
                  label: "POS",
                  value: formatMyr(data.posRevenue),
                  ...(posTrend
                    ? {
                        trend: {
                          direction: posTrend.direction,
                          label: posTrend.label,
                          goodWhen: "up" as const,
                        },
                      }
                    : {}),
                },
                {
                  label: "Bookings",
                  value: formatMyr(data.bookingRevenue),
                  ...(bookingTrend
                    ? {
                        trend: {
                          direction: bookingTrend.direction,
                          label: bookingTrend.label,
                          goodWhen: "up" as const,
                        },
                      }
                    : {}),
                },
              ]}
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

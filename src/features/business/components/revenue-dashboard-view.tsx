"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { ShoppingCart, BarChart3, TrendingUp, Receipt, BookOpen } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { SectionCard } from "@/components/ui/section-card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BarList } from "@/components/ui/bar-list-item";
import { HeatGrid, type HeatGridTone } from "@/components/ui/heat-grid";
import { DataMetricGrid } from "@/components/ui/data-metric";

import type {
  RevenueDashboardData,
  PaymentMethodBreakdown,
} from "@/features/business/types/revenue";

// ── Helpers ──────────────────────────────────────────────────────────────

const MYR = new Intl.NumberFormat("ms-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmt(v: number) {
  return MYR.format(v);
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "Card",
  face_pay: "Face Pay",
  digital_wallet: "E-Wallet",
  cash: "Cash",
};

// ── Payment mix using BarList ─────────────────────────────────────────────

function PaymentMix({
  items,
  testId,
}: Readonly<{ items: ReadonlyArray<PaymentMethodBreakdown>; testId: string }>) {
  const total = items.reduce((s, i) => s + i.revenue, 0);
  if (items.length === 0) return <p className="text-foreground-muted text-sm">No payment data.</p>;
  return (
    <BarList
      data-testid={testId}
      tone="brand"
      size="sm"
      items={items.map((item) => {
        const pct = total > 0 ? Math.round((item.revenue / total) * 100) : 0;
        return {
          id: item.method,
          label: PAYMENT_METHOD_LABEL[item.method] ?? item.method,
          value: fmt(item.revenue),
          rawValue: item.revenue,
          meta: `${item.count} txns`,
          trailing: (
            <Badge variant="secondary" className="font-mono text-xs">
              {pct}%
            </Badge>
          ),
          "data-testid": `pay-${item.method}`,
        };
      })}
    />
  );
}

const HEAT_LEGEND = [
  { range: "<70%", tone: "success" as HeatGridTone },
  { range: "70–90%", tone: "warning" as HeatGridTone },
  { range: ">90%", tone: "danger" as HeatGridTone },
];
function slotTone(v: number): HeatGridTone {
  return v >= 90 ? "danger" : v >= 70 ? "warning" : "success";
}

// ── Main component ────────────────────────────────────────────────────────

type RevenueDashboardViewProps = Readonly<{ data: RevenueDashboardData }>;

export function RevenueDashboardView({ data }: RevenueDashboardViewProps) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringEnum(["today", "7d", "30d"]).withOptions({
      clearOnDefault: true,
      history: "push",
      shallow: false,
    }),
  );

  const activeRange = range ?? "today";
  const posSeries = data.dailyTrend.map((d) => d.posRevenue);
  const bookingSeries = data.dailyTrend.map((d) => d.bookingRevenue);
  const combinedSeries = data.dailyTrend.map((d) => d.posRevenue + d.bookingRevenue);

  return (
    <div className="flex flex-col gap-6" data-testid="revenue-dashboard">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <PageHeader
        title="Revenue & Sales"
        description="Where money comes from, which products perform, and payment mix."
        eyebrow="BUSINESS · REVENUE"
        metaSlot={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
            {(["today", "7d", "30d"] as const).map((r) => {
              const label = r === "today" ? "Today" : r === "7d" ? "7 days" : "30 days";
              const active = activeRange === r;
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
                  data-testid={`revenue-range-${r}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* ── Top-line KPIs ─────────────────────────────────────────────── */}
      <KpiCardRow data-testid="revenue-kpis">
        <KpiCard
          label="Total Revenue"
          value={fmt(data.totalRevenue)}
          caption={`${data.periodFrom} – ${data.periodTo}`}
          icon={<TrendingUp className="size-4" />}
          emphasis="accent"
          {...(combinedSeries.length >= 2
            ? {
                sparkline: (
                  <Sparkline data={combinedSeries} tone="brand" label="Total revenue trend" />
                ),
              }
            : {})}
          data-testid="revenue-kpi-total"
        />
        <KpiCard
          label="POS Revenue"
          value={fmt(data.posRevenue)}
          caption={`${data.orderCount} orders`}
          icon={<ShoppingCart className="size-4" />}
          {...(posSeries.length >= 2
            ? { sparkline: <Sparkline data={posSeries} tone="neutral" /> }
            : {})}
          data-testid="revenue-kpi-pos"
        />
        <KpiCard
          label="Booking Revenue"
          value={fmt(data.bookingRevenue)}
          caption={`${data.bookingCount} bookings`}
          icon={<BarChart3 className="size-4" />}
          {...(bookingSeries.length >= 2
            ? { sparkline: <Sparkline data={bookingSeries} tone="brand" /> }
            : {})}
          data-testid="revenue-kpi-bookings"
        />
        <KpiCard
          label="Avg POS Ticket"
          value={data.avgPosTicket != null ? fmt(data.avgPosTicket) : "—"}
          icon={<Receipt className="size-4" />}
          data-testid="revenue-kpi-avg-pos"
        />
        <KpiCard
          label="Avg Booking Value"
          value={data.avgBookingValue != null ? fmt(data.avgBookingValue) : "—"}
          icon={<BookOpen className="size-4" />}
          data-testid="revenue-kpi-avg-booking"
        />
      </KpiCardRow>

      {/* ── Revenue by source — 2-column ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* POS breakdown */}
        <SectionCard title="POS Breakdown" data-testid="pos-breakdown">
          <div className="flex flex-col gap-5">
            {/* Revenue by point */}
            <div>
              <p className="text-foreground-subtle mb-2 text-xs font-medium tracking-wider uppercase">
                Revenue by POS Point
              </p>
              {data.posRevenueByPoint.length === 0 ? (
                <p className="text-foreground-muted text-sm">No POS orders in period.</p>
              ) : (
                <BarList
                  items={data.posRevenueByPoint.map((i) => ({
                    id: i.id,
                    label: i.label,
                    value: fmt(i.revenue),
                    rawValue: i.revenue,
                    meta: i.count != null ? `${i.count}×` : undefined,
                    "data-testid": `pos-point-${i.id}`,
                  }))}
                  data-testid="pos-revenue-list"
                />
              )}
            </div>

            <Separator />

            {/* Top items */}
            <div>
              <p className="text-foreground-subtle mb-2 text-xs font-medium tracking-wider uppercase">
                Top 10 Items by Revenue
              </p>
              {data.topItems.length === 0 ? (
                <p className="text-foreground-muted text-sm">No items sold in period.</p>
              ) : (
                <BarList
                  items={data.topItems.map((i) => ({
                    id: i.id,
                    label: i.label,
                    value: fmt(i.revenue),
                    rawValue: i.revenue,
                    meta: i.count != null ? `qty ${i.count}` : undefined,
                    "data-testid": `top-item-${i.id}`,
                  }))}
                  data-testid="top-items-list"
                />
              )}
            </div>

            <Separator />

            {/* Payment mix */}
            <div>
              <p className="text-foreground-subtle mb-2 text-xs font-medium tracking-wider uppercase">
                Payment Method Mix
              </p>
              <PaymentMix items={data.posPaymentMix} testId="pos-payment-mix" />
            </div>
          </div>
        </SectionCard>

        {/* Booking breakdown */}
        <SectionCard title="Booking Breakdown" data-testid="booking-breakdown">
          <div className="flex flex-col gap-5">
            {/* Revenue by tier */}
            <div>
              <p className="text-foreground-subtle mb-2 text-xs font-medium tracking-wider uppercase">
                Revenue by Tier
              </p>
              {data.bookingRevenueByTier.length === 0 ? (
                <p className="text-foreground-muted text-sm">No bookings in period.</p>
              ) : (
                <BarList
                  items={data.bookingRevenueByTier.map((i) => ({
                    id: i.id,
                    label: i.label,
                    value: fmt(i.revenue),
                    rawValue: i.revenue,
                    meta: i.count != null ? `${i.count} bookings` : undefined,
                    "data-testid": `tier-${i.id}`,
                  }))}
                  data-testid="tier-revenue-list"
                />
              )}
            </div>

            <Separator />

            {/* Revenue by experience */}
            <div>
              <p className="text-foreground-subtle mb-2 text-xs font-medium tracking-wider uppercase">
                Revenue by Experience
              </p>
              {data.bookingRevenueByExperience.length === 0 ? (
                <p className="text-foreground-muted text-sm">No bookings in period.</p>
              ) : (
                <BarList
                  items={data.bookingRevenueByExperience.map((i) => ({
                    id: i.id,
                    label: i.label,
                    value: fmt(i.revenue),
                    rawValue: i.revenue,
                    meta: i.count != null ? `${i.count} bookings` : undefined,
                    "data-testid": `experience-${i.id}`,
                  }))}
                  data-testid="experience-revenue-list"
                />
              )}
            </div>

            <Separator />

            {/* Booking payment mix */}
            <div>
              <p className="text-foreground-subtle mb-2 text-xs font-medium tracking-wider uppercase">
                Payment Method Mix
              </p>
              <PaymentMix items={data.bookingPaymentMix} testId="booking-payment-mix" />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Revenue trend ──────────────────────────────────────────────── */}
      {data.dailyTrend.length >= 2 && (
        <SectionCard
          title="Revenue Trend"
          description="Daily POS and booking revenue over the selected period."
          data-testid="revenue-trend"
        >
          <div className="flex flex-col gap-3">
            {/* Legend */}
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-brand-primary inline-block size-2.5 rounded-full" />
                <span className="text-foreground-subtle">Combined</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-status-neutral-solid inline-block size-2.5 rounded-full" />
                <span className="text-foreground-subtle">POS only</span>
              </span>
            </div>
            {/* Combined sparkline */}
            <div className="h-20 w-full">
              <Sparkline
                data={combinedSeries}
                tone="brand"
                label="Combined revenue trend"
                width={800}
                height={80}
                className="w-full"
              />
            </div>
            {/* POS-only sparkline */}
            <div className="h-12 w-full">
              <Sparkline
                data={posSeries}
                tone="neutral"
                label="POS revenue trend"
                width={800}
                height={48}
                className="w-full"
              />
            </div>
            {/* Date axis */}
            <div className="text-foreground-muted flex justify-between font-mono text-xs">
              <span>{data.dailyTrend[0]?.date}</span>
              <span>{data.dailyTrend[data.dailyTrend.length - 1]?.date}</span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Slot utilization ───────────────────────────────────────────── */}
      <SectionCard
        title="Slot Utilization"
        description="Daily booking fill rate. Each cell shows booked / capacity as a percentage."
        data-testid="slot-utilization"
      >
        {data.slotUtilization.length > 0 && (
          <DataMetricGrid
            cols={3}
            dividers
            metrics={[
              {
                label: "Peak Day",
                value: data.slotUtilization.reduce((a, b) => (a.utilPct >= b.utilPct ? a : b)).date,
              },
              {
                label: "Peak Utilisation",
                value: `${data.slotUtilization.reduce((a, b) => (a.utilPct >= b.utilPct ? a : b)).utilPct}%`,
              },
              {
                label: "Days at 100%",
                value: data.slotUtilization.filter((d) => d.utilPct >= 100).length,
              },
            ]}
            className="mb-4"
          />
        )}
        <HeatGrid
          items={data.slotUtilization.map((d) => ({
            key: d.date,
            value: d.utilPct,
            tooltip: `${d.date}: ${d.utilPct}%`,
          }))}
          getTone={slotTone}
          size="sm"
          legend={HEAT_LEGEND}
          emptyLabel="No slot data in range."
          data-testid="slot-heat-grid"
        />
      </SectionCard>
    </div>
  );
}

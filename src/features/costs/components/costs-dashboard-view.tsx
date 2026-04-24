"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { Package, TrendingDown, Boxes } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { StatTrend } from "@/components/ui/stat-trend";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { BarList } from "@/components/ui/bar-list-item";

import type { CostsDashboardData } from "@/features/costs/types/costs";

// ── Helpers ──────────────────────────────────────────────────────────────

const MYR = new Intl.NumberFormat("ms-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmt = (v: number) => MYR.format(v);

// ── Main component ────────────────────────────────────────────────────────

type CostsDashboardViewProps = Readonly<{ data: CostsDashboardData }>;

export function CostsDashboardView({ data }: CostsDashboardViewProps) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringEnum(["7d", "30d", "90d"]).withOptions({
      clearOnDefault: true,
      history: "push",
      shallow: false,
    }),
  );
  const activeRange = range ?? "30d";

  const wasteSeries = data.wasteTrend.map((d) => d.totalCost);

  return (
    <div className="flex flex-col gap-6" data-testid="costs-dashboard">
      <PageHeader
        title="Cost & Waste"
        description="Inventory value on hand, COGS, waste analysis, and stock composition."
        eyebrow="BUSINESS · COSTS"
        metaSlot={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
            {(["7d", "30d", "90d"] as const).map((r) => {
              const label = r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days";
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
                  data-testid={`costs-range-${r}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* ── Inventory KPIs ────────────────────────────────────────────── */}
      <KpiCardRow data-testid="costs-kpis">
        <KpiCard
          label="Inventory on Hand"
          value={fmt(data.totalStockValue)}
          caption="current stock value"
          icon={<Package className="size-4" />}
          emphasis="accent"
          data-testid="costs-kpi-stock"
        />
        <KpiCard
          label="COGS"
          value={fmt(data.totalCogs)}
          caption={`${data.periodFrom} – ${data.periodTo}`}
          icon={<Boxes className="size-4" />}
          data-testid="costs-kpi-cogs"
        />
        <KpiCard
          label="Total Waste"
          value={fmt(data.totalWasteCost)}
          caption={`${data.periodFrom} – ${data.periodTo}`}
          icon={<TrendingDown className="size-4" />}
          emphasis={data.totalWasteCost > 0 ? "accent" : "default"}
          {...(wasteSeries.length >= 2
            ? { sparkline: <Sparkline data={wasteSeries} tone="danger" label="Waste trend" /> }
            : {})}
          data-testid="costs-kpi-waste"
        />
      </KpiCardRow>

      {/* ── Waste as % of COGS — prominent hero metric ────────────────── */}
      {data.wasteToCogsPct != null && (
        <SectionCard
          title="Waste to COGS Ratio"
          description="Key operational health metric — total waste cost as a percentage of COGS."
          data-testid="costs-waste-to-cogs"
        >
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-foreground text-5xl font-bold tracking-tighter tabular-nums">
                {data.wasteToCogsPct}%
              </span>
              <span className="text-foreground-muted text-sm">
                {fmt(data.totalWasteCost)} waste / {fmt(data.totalCogs)} COGS
              </span>
            </div>
            <StatTrend
              direction={data.wasteToCogsPct > 5 ? "up" : "flat"}
              label={data.wasteToCogsPct > 5 ? "Above 5% threshold" : "Within target"}
              goodWhen="down"
              size="md"
            />
          </div>
        </SectionCard>
      )}

      {/* ── Waste analysis — 2-column ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Waste by reason */}
        <SectionCard
          title="Waste by Reason"
          description="Breakdown of write-off costs by disposal reason."
          data-testid="waste-by-reason"
        >
          {data.wasteByReason.length === 0 ? (
            <p className="text-foreground-muted text-sm">No write-offs in period.</p>
          ) : (
            <BarList
              tone="warning"
              items={data.wasteByReason.map((item) => ({
                rawValue: item.totalCost,
                value: fmt(item.totalCost),
                label: item.label,
                meta: `${item.quantity.toFixed(2)} units`,
              }))}
            />
          )}
        </SectionCard>

        {/* Top 10 wasted materials */}
        <SectionCard
          title="Top Wasted Materials"
          description="Highest-cost materials written off in the period."
          data-testid="top-wasted-materials"
        >
          {data.topWastedMaterials.length === 0 ? (
            <p className="text-foreground-muted text-sm">No write-offs in period.</p>
          ) : (
            <BarList
              tone="danger"
              items={data.topWastedMaterials.map((item) => ({
                rawValue: item.totalCost,
                value: fmt(item.totalCost),
                label: item.materialName,
                meta: `qty ${item.quantity.toFixed(2)}`,
              }))}
            />
          )}
        </SectionCard>
      </div>

      {/* ── Waste trend sparkline ─────────────────────────────────────── */}
      {wasteSeries.length >= 2 && (
        <SectionCard
          title="Waste Trend"
          description={`Daily write-off cost — ${data.periodFrom} to ${data.periodTo}`}
          data-testid="waste-trend"
        >
          <div className="flex flex-col gap-2">
            <div className="h-20 w-full">
              <Sparkline
                data={wasteSeries}
                tone="danger"
                label="Daily waste cost trend"
                width={800}
                height={80}
                className="w-full"
              />
            </div>
            <div className="text-foreground-muted flex justify-between font-mono text-xs">
              <span>{data.wasteTrend[0]?.date}</span>
              <span>{data.wasteTrend[data.wasteTrend.length - 1]?.date}</span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Inventory composition ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* By location */}
        <SectionCard
          title="Stock Value by Location"
          description="Current inventory value distributed across locations."
          action={
            <Badge variant="outline" className="font-mono text-xs">
              {fmt(data.totalStockValue)} total
            </Badge>
          }
          data-testid="stock-by-location"
        >
          {data.stockByLocation.length === 0 ? (
            <p className="text-foreground-muted text-sm">No stock data.</p>
          ) : (
            <BarList
              items={data.stockByLocation.map((item) => ({
                rawValue: item.stockValue,
                value: fmt(item.stockValue),
                label: item.locationName,
              }))}
            />
          )}
        </SectionCard>

        {/* By material type */}
        <SectionCard
          title="Stock Value by Material Type"
          description="Inventory value split by material classification."
          data-testid="stock-by-type"
        >
          {data.stockByType.length === 0 ? (
            <p className="text-foreground-muted text-sm">No stock data.</p>
          ) : (
            <BarList
              items={data.stockByType.map((item) => ({
                rawValue: item.stockValue,
                value: fmt(item.stockValue),
                label: item.label,
              }))}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

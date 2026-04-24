"use client";

import * as React from "react";
import { useEffect } from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { Activity, Siren, Wrench, Calendar, Clock, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GaugeRing } from "@/components/ui/gauge-ring";
import { HeatGrid, type HeatGridTone } from "@/components/ui/heat-grid";
import { DataMetricGrid } from "@/components/ui/data-metric";
import { ProgressBar, progressTone } from "@/components/ui/progress-bar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import type {
  OperationsDashboardData,
  ZoneOccupancy,
  IncidentGroupCount,
  MaintenanceWORow,
} from "@/features/operations/types/operations";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

const SLOT_LEGEND = [
  { range: "<70%", tone: "success" as HeatGridTone },
  { range: "70–90%", tone: "warning" as HeatGridTone },
  { range: ">90%", tone: "danger" as HeatGridTone },
];

function slotHeatTone(value: number): HeatGridTone {
  if (value >= 90) return "danger";
  if (value >= 70) return "warning";
  return "success";
}

// ── Zone card — GaugeRing + ProgressBar from sink ─────────────────────────

function ZoneCard({ zone }: Readonly<{ zone: ZoneOccupancy }>) {
  const tone = progressTone(zone.loadPct);
  return (
    <div
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-3 shadow-xs"
      data-testid={`zone-card-${zone.zoneId}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">{zone.zoneName}</p>
          {zone.locationName && (
            <p className="text-foreground-muted text-xs">{zone.locationName}</p>
          )}
        </div>
        <GaugeRing
          value={zone.loadPct}
          size={52}
          tone={tone}
          label={`${zone.loadPct}%`}
          aria-label={`${zone.zoneName}: ${zone.loadPct}% occupied`}
        />
      </div>
      <ProgressBar
        value={zone.loadPct}
        tone={tone}
        size="sm"
        aria-label={`${zone.zoneName} occupancy bar`}
      />
      <p className="text-foreground-muted text-right font-mono text-xs tabular-nums">
        {zone.currentOccupancy} / {zone.capacity}
      </p>
    </div>
  );
}

function IncidentGroupRow({ group }: Readonly<{ group: IncidentGroupCount }>) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5"
      data-testid={`incident-group-${group.group}`}
    >
      <span className="text-foreground text-sm font-medium">{group.label}</span>
      <div className="flex items-center gap-3">
        {group.open > 0 && <StatusBadge status="open" tone="danger" label={`${group.open} open`} />}
        {group.resolvedInPeriod > 0 && (
          <StatusBadge
            status="resolved"
            tone="success"
            label={`${group.resolvedInPeriod} resolved`}
          />
        )}
        {group.open === 0 && group.resolvedInPeriod === 0 && (
          <span className="text-foreground-muted text-xs">None</span>
        )}
      </div>
    </div>
  );
}

function WORow({ wo }: Readonly<{ wo: MaintenanceWORow }>) {
  return (
    <div
      className="border-border-subtle flex flex-wrap items-center gap-3 border-b py-2.5 last:border-0"
      data-testid={`wo-row-${wo.id}`}
    >
      <StatusBadge status={wo.status} />
      <Badge variant="outline" className="text-xs">
        {wo.topology === "onsite" ? "On-site" : "Remote"}
      </Badge>
      <span className="text-foreground text-sm font-medium">{wo.deviceName}</span>
      {wo.zoneName && <span className="text-foreground-muted text-xs">— {wo.zoneName}</span>}
      <span className="text-foreground-subtle ml-auto text-xs">{wo.vendorName}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

type OperationsDashboardViewProps = Readonly<{
  data: OperationsDashboardData;
}>;

export function OperationsDashboardView({ data }: OperationsDashboardViewProps) {
  // Live occupancy local state — updated by Realtime subscription
  const [liveOccupancy, setLiveOccupancy] = React.useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const z of data.zones) m.set(z.zoneId, z.currentOccupancy);
    return m;
  });

  // Realtime subscription on zone_telemetry INSERT — per prompt.md §23
  // useEffect is the correct hook for subscriptions with cleanup.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("ops-zone-telemetry")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "zone_telemetry" },
        (payload) => {
          const row = payload.new as { zone_id: string; current_occupancy: number };
          setLiveOccupancy((prev) => {
            const next = new Map(prev);
            next.set(row.zone_id, row.current_occupancy ?? 0);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [range, setRange] = useQueryState(
    "range",
    parseAsStringEnum(["today", "7d", "30d"]).withOptions({
      clearOnDefault: true,
      history: "push",
      shallow: false,
    }),
  );

  const activeRange = range ?? "today";

  // Recompute live totals from liveOccupancy
  const liveTotalOccupancy = Array.from(liveOccupancy.values()).reduce((s, v) => s + v, 0);
  const occupancyPct =
    data.totalCapacity > 0
      ? Math.min(100, Math.round((liveTotalOccupancy / data.totalCapacity) * 100))
      : 0;

  // Patch zone list with live occupancy
  const liveZones: ZoneOccupancy[] = data.zones
    .map((z) => {
      const occ = liveOccupancy.get(z.zoneId) ?? z.currentOccupancy;
      const cap = z.capacity;
      return {
        ...z,
        currentOccupancy: occ,
        loadPct: cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0,
      };
    })
    .sort((a, b) => b.loadPct - a.loadPct);

  const openIncidentTotal = data.incidentGroups.reduce((s, g) => s + g.open, 0);
  const openedSeries = data.incidentTrend.map((d) => d.opened);

  // Peak utilization for summary
  const peakUtil = data.slotUtilization.reduce(
    (best, d) => (d.utilPct > best.utilPct ? d : best),
    data.slotUtilization[0] ?? { date: "—", utilPct: 0, bookedCount: 0, capacity: 0 },
  );

  return (
    <div className="flex flex-col gap-6" data-testid="operations-dashboard">
      <PageHeader
        title="Operations"
        description="Live facility occupancy, incident status, maintenance impact, and capacity utilisation."
        eyebrow="BUSINESS · OPERATIONS"
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
                  data-testid={`ops-range-${r}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* ── Live Occupancy ─────────────────────────────────────────── */}
      <SectionCard
        title="Live Occupancy"
        description="Real-time guest count across all active zones. Updates automatically."
        action={
          <div className="flex items-center gap-1.5">
            <span
              className="bg-status-success-solid size-2 animate-pulse rounded-full"
              aria-hidden
            />
            <span className="text-foreground-subtle text-xs">Live</span>
          </div>
        }
        data-testid="live-occupancy"
      >
        <div className="flex flex-col gap-4">
          {/* Facility-wide gauge + summary */}
          <div className="flex flex-wrap items-center gap-6">
            <GaugeRing
              value={occupancyPct}
              size={88}
              tone={progressTone(occupancyPct)}
              label={`${occupancyPct}%`}
              caption="Facility"
              aria-label={`Facility occupancy ${occupancyPct}%`}
            />
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-2xl font-bold tabular-nums">
                {liveTotalOccupancy}
                <span className="text-foreground-muted text-base font-normal">
                  {" "}
                  / {data.totalCapacity}
                </span>
              </p>
              <p className="text-foreground-muted text-sm">guests in facility</p>
              {liveZones.filter((z) => z.loadPct >= 70).length > 0 && (
                <Badge
                  variant="outline"
                  className="border-status-warning-border text-status-warning-foreground w-fit text-xs"
                >
                  {liveZones.filter((z) => z.loadPct >= 70).length} zone
                  {liveZones.filter((z) => z.loadPct >= 70).length > 1 ? "s" : ""} at risk
                </Badge>
              )}
            </div>
          </div>

          {/* Per-zone grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {liveZones.map((z) => (
              <ZoneCard key={z.zoneId} zone={z} />
            ))}
            {liveZones.length === 0 && (
              <p className="text-foreground-muted col-span-full py-4 text-center text-sm">
                No active zones with telemetry data.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Incidents + Maintenance — side by side on xl+ ────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Incident summary */}
        <SectionCard
          title="Incident Summary"
          description={`Open incidents by category — ${data.periodFrom} to ${data.periodTo}`}
          action={
            openIncidentTotal > 0 ? (
              <Badge variant="destructive" className="tabular-nums">
                {openIncidentTotal} open
              </Badge>
            ) : undefined
          }
          data-testid="incident-summary"
        >
          <div className="flex flex-col gap-4">
            {/* KPIs */}
            <KpiCardRow>
              <KpiCard
                label="Open Incidents"
                value={openIncidentTotal}
                icon={<Siren className="size-4" />}
                emphasis={openIncidentTotal > 0 ? "accent" : "default"}
                {...(openedSeries.length >= 2
                  ? {
                      sparkline: (
                        <Sparkline
                          data={openedSeries}
                          tone={openIncidentTotal > 0 ? "danger" : "neutral"}
                        />
                      ),
                    }
                  : {})}
                data-testid="ops-kpi-incidents"
              />
              <KpiCard
                label="Avg Resolution Time"
                value={data.avgResolutionMs != null ? formatDuration(data.avgResolutionMs) : "—"}
                icon={<Clock className="size-4" />}
                data-testid="ops-kpi-resolution"
              />
            </KpiCardRow>

            <Separator />

            {/* Category breakdown */}
            <div className="divide-border-subtle flex flex-col divide-y">
              {data.incidentGroups.map((group) => (
                <IncidentGroupRow key={group.group} group={group} />
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Maintenance impact */}
        <SectionCard
          title="Maintenance Impact"
          description="Active work orders and scheduled maintenance this week."
          data-testid="maintenance-impact"
        >
          <div className="flex flex-col gap-4">
            <KpiCardRow>
              <KpiCard
                label="Active WOs"
                value={data.activeWOs.length}
                icon={<Wrench className="size-4" />}
                emphasis={data.activeWOs.length > 0 ? "accent" : "default"}
                data-testid="ops-kpi-active-wo"
              />
              <KpiCard
                label="Scheduled This Week"
                value={data.scheduledWOs.length}
                icon={<Calendar className="size-4" />}
                data-testid="ops-kpi-scheduled-wo"
              />
            </KpiCardRow>

            {data.activeWOs.length > 0 && (
              <>
                <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
                  Active
                </p>
                <div className="flex flex-col">
                  {data.activeWOs.map((wo) => (
                    <WORow key={wo.id} wo={wo} />
                  ))}
                </div>
              </>
            )}

            {data.scheduledWOs.length > 0 && (
              <>
                <Separator />
                <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
                  Upcoming This Week
                </p>
                <div className="flex flex-col">
                  {data.scheduledWOs.map((wo) => (
                    <WORow key={wo.id} wo={wo} />
                  ))}
                </div>
              </>
            )}

            {data.activeWOs.length === 0 && data.scheduledWOs.length === 0 && (
              <p className="text-foreground-muted text-center text-sm">
                No active or scheduled maintenance.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Capacity Utilization ────────────────────────────────────── */}
      <SectionCard
        title="Capacity Utilisation"
        description="Daily slot fill rate. Each tile shows booked / total capacity."
        data-testid="capacity-utilization"
      >
        <div className="flex flex-col gap-4">
          {data.slotUtilization.length > 0 && (
            <DataMetricGrid
              cols={3}
              dividers
              metrics={[
                {
                  label: "Peak Day",
                  value: peakUtil.date,
                  icon: <TrendingUp className="size-3.5" />,
                },
                {
                  label: "Peak Utilisation",
                  value: `${peakUtil.utilPct}%`,
                  tone:
                    progressTone(peakUtil.utilPct) === "danger"
                      ? "danger"
                      : progressTone(peakUtil.utilPct) === "warning"
                        ? "warning"
                        : "success",
                  icon: <Activity className="size-3.5" />,
                },
                {
                  label: "Days at 100%",
                  value: data.slotUtilization.filter((d) => d.utilPct >= 100).length,
                  icon: <Calendar className="size-3.5" />,
                },
              ]}
              data-testid="ops-utilization-metrics"
            />
          )}
          <HeatGrid
            items={data.slotUtilization.map((d) => ({
              key: d.date,
              value: d.utilPct,
              tooltip: `${d.date}: ${d.utilPct}% (${d.bookedCount}/${d.capacity})`,
            }))}
            getTone={slotHeatTone}
            size="md"
            legend={SLOT_LEGEND}
            emptyLabel="No slot data in period."
            data-testid="ops-heat-grid"
          />
        </div>
      </SectionCard>
    </div>
  );
}

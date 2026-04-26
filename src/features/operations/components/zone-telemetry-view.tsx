"use client";

import * as React from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Thermometer,
  Droplets,
  Users,
  MapPin,
  AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  TelemetryData,
  TelemetryLocationGroup,
  TelemetryZoneCard,
} from "@/features/operations/queries/get-zone-telemetry";

// ── Props ──────────────────────────────────────────────────────────────

type ZoneTelemetryViewProps = Readonly<{
  data: TelemetryData;
}>;

// ── Occupancy gauge helpers ────────────────────────────────────────────

function loadColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function loadBadgeVariant(pct: number): "destructive" | "secondary" | "outline" {
  if (pct >= 90) return "destructive";
  if (pct >= 70) return "secondary";
  return "outline";
}

// ── Zone Card ──────────────────────────────────────────────────────────

function ZoneOccupancyCard({ zone }: Readonly<{ zone: TelemetryZoneCard }>) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
      data-testid={`zone-card-${zone.zoneId}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{zone.zoneName}</span>
          <span className="text-xs text-foreground-muted">
            {zone.currentOccupancy} / {zone.capacity} guests
          </span>
        </div>
        <Badge variant={loadBadgeVariant(zone.loadPct)} data-testid={`zone-badge-${zone.zoneId}`}>
          {zone.loadPct}%
        </Badge>
      </div>

      {/* Occupancy bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full transition-all", loadColor(zone.loadPct))}
          style={{ width: `${Math.min(zone.loadPct, 100)}%` }}
        />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1">
          <Users aria-hidden className="size-3" />
          {zone.crewCount} crew
        </span>
        {zone.temperature != null && (
          <span className="inline-flex items-center gap-1">
            <Thermometer aria-hidden className="size-3" />
            {zone.temperature}°C
          </span>
        )}
        {zone.humidity != null && (
          <span className="inline-flex items-center gap-1">
            <Droplets aria-hidden className="size-3" />
            {zone.humidity}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Location Group ─────────────────────────────────────────────────────

function LocationGroup({ group }: Readonly<{ group: TelemetryLocationGroup }>) {
  const [open, setOpen] = React.useState(true);
  const ChevIcon = open ? ChevronDown : ChevronRight;

  return (
    <SectionCard data-testid={`location-group-${group.locationId}`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`location-zones-${group.locationId}`}
        data-testid={`location-toggle-${group.locationId}`}
      >
        <ChevIcon aria-hidden className="size-4 text-foreground-muted" />
        <MapPin aria-hidden className="size-4 text-foreground-muted" />
        <span className="text-sm font-semibold text-foreground">{group.locationName}</span>
        <span className="text-xs text-foreground-muted">({group.zones.length} zones)</span>
      </button>

      {open && (
        <div
          id={`location-zones-${group.locationId}`}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {group.zones.map((zone) => (
            <ZoneOccupancyCard key={zone.zoneId} zone={zone} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

export function ZoneTelemetryView({ data }: ZoneTelemetryViewProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="zone-telemetry-page">
      <PageHeader
        eyebrow="Operations"
        title="Zone Telemetry"
        description="Real-time zone occupancy dashboard — guest counts and staff positions."
        data-testid="telemetry-header"
      />

      <KpiCardRow data-testid="telemetry-kpis">
        <KpiCard
          label="Total Guests"
          value={data.totalGuests}
          caption="across all zones"
          icon={<Users aria-hidden className="size-4" />}
          data-testid="telemetry-kpi-guests"
        />
        <KpiCard
          label="Total Crew"
          value={data.totalCrew}
          caption="on-site now"
          icon={<Activity aria-hidden className="size-4" />}
          data-testid="telemetry-kpi-crew"
        />
        <KpiCard
          label="At Capacity"
          value={data.zonesAtCapacity}
          caption="zones at or over limit"
          icon={<AlertTriangle aria-hidden className="size-4" />}
          {...(data.zonesAtCapacity > 0
            ? {
                trend: {
                  direction: "up" as const,
                  label: `${data.zonesAtCapacity} zone${data.zonesAtCapacity !== 1 ? "s" : ""}`,
                  goodWhen: "down" as const,
                },
              }
            : {})}
          data-testid="telemetry-kpi-capacity"
        />
      </KpiCardRow>

      {data.groups.length === 0 ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-2 py-12 text-center text-foreground-muted">
            <MapPin className="size-8" />
            <p className="text-sm font-medium">No active zones</p>
            <p className="text-xs">
              Zone telemetry will appear here when zones are configured in the admin portal.
            </p>
          </div>
        </SectionCard>
      ) : (
        data.groups.map((group) => <LocationGroup key={group.locationId} group={group} />)
      )}
    </div>
  );
}

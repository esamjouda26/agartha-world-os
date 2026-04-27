"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { formatDistanceToNow, parseISO, isBefore, subHours } from "date-fns";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  HelpCircle,
  Thermometer,
  Wind,
  Users,
  Activity,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { GaugeRing } from "@/components/ui/gauge-ring";
import { progressTone } from "@/components/ui/progress-bar";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";

import type {
  SystemHealthData,
  HealthHeartbeatRow,
  ZoneTelemetryRow,
  SystemHealthKpis,
} from "@/features/it/queries/get-system-health";

// ── Heartbeat table columns ────────────────────────────────────────────

function buildHeartbeatColumns(): ColumnDef<HealthHeartbeatRow, unknown>[] {
  return [
    {
      id: "deviceName",
      accessorKey: "deviceName",
      header: "Device",
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.deviceName}</span>
      ),
    },
    {
      id: "deviceTypeName",
      accessorKey: "deviceTypeName",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {row.original.deviceTypeName}
        </Badge>
      ),
    },
    {
      id: "heartbeatStatus",
      accessorKey: "heartbeatStatus",
      header: "Heartbeat",
      cell: ({ row }) => {
        const s = row.original.heartbeatStatus;
        if (s === null) {
          return (
            <span className="text-foreground-muted flex items-center gap-1.5 text-sm">
              <HelpCircle className="size-3.5" aria-hidden />
              Never
            </span>
          );
        }
        return <StatusBadge status={s} />;
      },
      meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
    },
    {
      id: "responseTimeMs",
      accessorKey: "responseTimeMs",
      header: "Response",
      cell: ({ row }) => {
        const ms = row.original.responseTimeMs;
        return (
          <span className="text-foreground-subtle text-sm tabular-nums">
            {ms != null ? `${ms} ms` : "—"}
          </span>
        );
      },
      meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
    },
    {
      id: "lastHeartbeatAt",
      accessorKey: "lastHeartbeatAt",
      header: "Last Seen",
      cell: ({ row }) => {
        const ts = row.original.lastHeartbeatAt;
        if (!ts) return <span className="text-foreground-muted text-sm">—</span>;
        const isStale = isBefore(parseISO(ts), subHours(new Date(), 1));
        return (
          <span
            className={
              isStale ? "text-status-danger-foreground text-sm" : "text-foreground-subtle text-sm"
            }
          >
            {formatDistanceToNow(parseISO(ts), { addSuffix: true })}
          </span>
        );
      },
    },
  ];
}

// ── Zone telemetry card ────────────────────────────────────────────────

function ZoneTelemetryItem({ row }: Readonly<{ row: ZoneTelemetryRow }>) {
  const hasData =
    row.currentOccupancy != null ||
    row.temperature != null ||
    row.humidity != null ||
    row.co2Level != null;

  return (
    <li
      className="border-border-subtle flex flex-wrap items-center gap-x-6 gap-y-1 border-b py-2.5 text-sm last:border-0"
      data-testid={`zone-telemetry-${row.zoneId}`}
    >
      <span className="text-foreground min-w-[8rem] font-medium">{row.zoneName}</span>
      {hasData ? (
        <>
          {row.currentOccupancy != null && (
            <span className="text-foreground-subtle flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {row.currentOccupancy}
            </span>
          )}
          {row.temperature != null && (
            <span className="text-foreground-subtle flex items-center gap-1">
              <Thermometer className="size-3.5" aria-hidden />
              {row.temperature.toFixed(1)} °C
            </span>
          )}
          {row.humidity != null && (
            <span className="text-foreground-subtle flex items-center gap-1">
              <Wind className="size-3.5" aria-hidden />
              {row.humidity.toFixed(1)} %
            </span>
          )}
          {row.co2Level != null && (
            <span className="text-foreground-muted text-xs tabular-nums">
              CO₂ {row.co2Level.toFixed(0)} ppm
            </span>
          )}
          {row.recordedAt && (
            <span className="text-foreground-muted ml-auto text-xs">
              {formatDistanceToNow(parseISO(row.recordedAt), { addSuffix: true })}
            </span>
          )}
        </>
      ) : (
        <span className="text-foreground-muted text-xs">No telemetry yet</span>
      )}
    </li>
  );
}

// ── KPI row — pure sink components ─────────────────────────────────────

function HeartbeatKpis({ kpis }: Readonly<{ kpis: SystemHealthKpis }>) {
  const onlinePct = kpis.totalDevices > 0 ? Math.round((kpis.online / kpis.totalDevices) * 100) : 0;
  const gaugeTone = progressTone(onlinePct, { warn: 70, crit: 50 });

  return (
    <KpiCardRow data-testid="health-kpis">
      <KpiCard
        label="Fleet Health"
        value={`${kpis.online} / ${kpis.totalDevices}`}
        caption="devices online"
        icon={<Wifi className="size-4" />}
        sparkline={
          <GaugeRing
            value={onlinePct}
            size={64}
            tone={gaugeTone}
            label={`${onlinePct}%`}
            aria-label={`Fleet health: ${onlinePct}% online`}
            data-testid="health-gauge"
          />
        }
        emphasis={onlinePct < 70 ? "accent" : "default"}
        data-testid="health-kpi-fleet"
      />
      <KpiCard
        label="Degraded"
        value={kpis.degraded}
        caption={kpis.degraded > 0 ? "need attention" : "all healthy"}
        icon={<AlertTriangle className="size-4" />}
        emphasis={kpis.degraded > 0 ? "accent" : "default"}
        {...(kpis.degraded > 0
          ? {
              trend: {
                direction: "up" as const,
                label: `${kpis.degraded} alert${kpis.degraded > 1 ? "s" : ""}`,
                goodWhen: "down" as const,
              },
            }
          : {})}
        data-testid="health-kpi-degraded"
      />
      <KpiCard
        label="Offline"
        value={kpis.offline}
        caption={kpis.offline > 0 ? "unreachable" : "none down"}
        icon={<WifiOff className="size-4" />}
        emphasis={kpis.offline > 0 ? "accent" : "default"}
        {...(kpis.offline > 0
          ? {
              trend: {
                direction: "up" as const,
                label: `${kpis.offline} device${kpis.offline > 1 ? "s" : ""}`,
                goodWhen: "down" as const,
              },
            }
          : {})}
        data-testid="health-kpi-offline"
      />
      <KpiCard
        label="Telemetry"
        value={`${kpis.zonesCovered} / ${kpis.totalZones}`}
        caption="zones covered"
        icon={<Thermometer className="size-4" />}
        data-testid="health-kpi-telemetry"
      />
    </KpiCardRow>
  );
}

// ── Main view ──────────────────────────────────────────────────────────

type SystemHealthViewProps = Readonly<{ data: SystemHealthData }>;

export function SystemHealthView({ data }: SystemHealthViewProps) {
  const router = useRouter();

  const columns = React.useMemo(() => buildHeartbeatColumns(), []);

  return (
    <div className="flex flex-col gap-6" data-testid="system-health-page">
      <PageHeader
        title="System Health"
        description="Real-time device heartbeat status and zone sensor telemetry."
      />

      {/* Heartbeat grid — KPIs + sortable device × heartbeat table */}
      <FilterableDataTable
        data-testid="heartbeat-grid"
        kpis={<HeartbeatKpis kpis={data.kpis} />}
        emptyState={{
          variant: "first-use" as const,
          title: "No devices registered",
          description: "Register devices in the Device Registry to start monitoring.",
          icon: <Activity className="size-8" />,
        }}
        table={{
          data: data.heartbeats,
          columns,
          mobileFieldPriority: ["deviceName", "heartbeatStatus", "lastHeartbeatAt"],
          getRowId: (row) => row.deviceId,
          onRowClick: (row) => router.push(`/admin/devices/${row.deviceId}`),
          "data-testid": "heartbeat-table",
        }}
      />

      {/* Zone telemetry summary */}
      <SectionCard
        title="Zone Telemetry"
        description="Latest sensor readings per active zone."
        data-testid="zone-telemetry-card"
      >
        {data.zoneTelemetry.length === 0 ? (
          <p className="text-foreground-muted py-4 text-center text-sm">
            No active zones with telemetry data.
          </p>
        ) : (
          <ul role="list" className="flex flex-col">
            {data.zoneTelemetry.map((row) => (
              <ZoneTelemetryItem key={row.zoneId} row={row} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

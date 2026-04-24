"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, HardDrive, Activity, ShieldCheck, Wrench, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

import type {
  SystemDashboardData,
  AlertFeedItem,
} from "@/features/it/queries/get-system-dashboard";

// ── Status chart colors — use CSS variable tokens ──────────────────────

const STATUS_COLORS: Record<string, string> = {
  online: "var(--status-success-solid)",
  offline: "var(--status-neutral-solid)",
  maintenance: "var(--status-warning-solid)",
  degraded: "var(--status-warning-solid)",
  decommissioned: "var(--status-danger-solid)",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "var(--status-neutral-solid)";
}

// ── Props ──────────────────────────────────────────────────────────────

type SystemDashboardViewProps = Readonly<{
  data: SystemDashboardData;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function SystemDashboardView({ data }: SystemDashboardViewProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="it-dashboard">
      <PageHeader
        title="System Dashboard"
        description="Infrastructure health, active incidents, and pending actions."
        data-testid="it-dashboard-header"
      />

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <KpiCardRow data-testid="it-dashboard-kpis">
        <Link href="/admin/devices" className="contents" data-testid="it-kpi-fleet-link">
          <KpiCard
            label="Fleet Health"
            value={`${data.onlineDevices}/${data.totalDevices}`}
            caption="devices online"
            icon={<HardDrive aria-hidden className="size-4" />}
            {...(data.totalDevices > 0
              ? {
                  trend: {
                    direction:
                      data.onlineDevices / data.totalDevices >= 0.9
                        ? ("up" as const)
                        : data.onlineDevices / data.totalDevices >= 0.7
                          ? ("flat" as const)
                          : ("down" as const),
                    label: `${Math.round((data.onlineDevices / data.totalDevices) * 100)}% uptime`,
                    goodWhen: "up" as const,
                  },
                }
              : {})}
            data-testid="it-kpi-fleet"
          />
        </Link>

        <Link href="/admin/system-health" className="contents" data-testid="it-kpi-alerts-link">
          <KpiCard
            label="Heartbeat Alerts"
            value={data.heartbeatAlertCount}
            caption="offline / degraded"
            icon={<AlertTriangle aria-hidden className="size-4" />}
            trend={
              data.heartbeatAlertCount > 0
                ? {
                    direction: "up",
                    label: `${data.heartbeatAlertCount} alert${data.heartbeatAlertCount !== 1 ? "s" : ""}`,
                    goodWhen: "down",
                  }
                : { direction: "flat", label: "All clear" }
            }
            data-testid="it-kpi-alerts"
          />
        </Link>

        <KpiCard
          label="Active Maintenance"
          value={data.activeMaintenanceCount}
          caption="WOs in progress"
          icon={<Wrench aria-hidden className="size-4" />}
          data-testid="it-kpi-maintenance"
        />

        <Link href="/admin/iam" className="contents" data-testid="it-kpi-iam-link">
          <KpiCard
            label="Pending IAM"
            value={data.pendingIamCount}
            caption="awaiting IT"
            icon={<ShieldCheck aria-hidden className="size-4" />}
            trend={
              data.pendingIamCount > 0
                ? {
                    direction: "up",
                    label: `${data.pendingIamCount} pending`,
                    goodWhen: "down",
                  }
                : { direction: "flat", label: "Queue clear" }
            }
            data-testid="it-kpi-iam"
          />
        </Link>
      </KpiCardRow>

      {/* ── Main content: 2-column layout on desktop ────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Alert Feed (left) ────────────────────────────────── */}
        <SectionCard
          title="Alert Feed"
          description="Last 24 hours"
          data-testid="it-alert-feed-section"
        >
          <AlertFeedList items={data.alertFeed} />
        </SectionCard>

        {/* ── Right column: chart + sparkline ───────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Device Status Chart */}
          <SectionCard
            title="Device Status"
            description="Fleet breakdown by status"
            data-testid="it-device-status-section"
          >
            <DeviceStatusChart data={data.deviceStatusCounts} />
          </SectionCard>

          {/* Response Time Sparkline */}
          <SectionCard
            title="Avg Response Time"
            description="24h facility-wide median (ms)"
            data-testid="it-response-time-section"
          >
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-foreground text-3xl font-semibold tabular-nums">
                  {data.avgResponseTimeMs != null ? `${data.avgResponseTimeMs}ms` : "—"}
                </p>
                <p className="text-foreground-muted text-xs">
                  {data.responseTimeSeries.filter((v) => v > 0).length} data points
                </p>
              </div>
              <div className="h-12 w-40 shrink-0">
                <Sparkline
                  data={data.responseTimeSeries}
                  tone={
                    data.avgResponseTimeMs != null && data.avgResponseTimeMs > 500
                      ? "danger"
                      : data.avgResponseTimeMs != null && data.avgResponseTimeMs > 200
                        ? "warning"
                        : "brand"
                  }
                  label="Response time trend over 24 hours"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ── Alert Feed List ────────────────────────────────────────────────────

function AlertFeedList({ items }: Readonly<{ items: ReadonlyArray<AlertFeedItem> }>) {
  if (items.length === 0) {
    return (
      <div
        className="text-foreground-muted flex flex-col items-center justify-center gap-2 py-12 text-center"
        data-testid="it-alert-feed-empty"
      >
        <Activity aria-hidden className="text-foreground-subtle size-8" />
        <p className="text-sm font-medium">No alerts in the last 24 hours</p>
        <p className="text-xs">All systems operating normally.</p>
      </div>
    );
  }

  return (
    <div
      className="divide-border-subtle -mx-1 max-h-[400px] divide-y overflow-y-auto px-1"
      data-testid="it-alert-feed-list"
    >
      {items.map((item) => (
        <AlertFeedRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function AlertFeedRow({ item }: Readonly<{ item: AlertFeedItem }>) {
  const timeAgo = formatRelativeTime(item.timestamp);
  const Icon = item.type === "heartbeat" ? AlertTriangle : Wrench;

  const content = (
    <div
      className={cn(
        "group flex items-start gap-3 py-3 transition-colors",
        item.deviceId && "hover:bg-background-subtle cursor-pointer rounded-md",
      )}
      data-testid={`it-alert-${item.id}`}
    >
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          item.type === "heartbeat"
            ? "bg-status-danger-soft text-status-danger-foreground"
            : "bg-status-warning-soft text-status-warning-foreground",
        )}
      >
        <Icon aria-hidden className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-foreground truncate text-sm font-medium">{item.title}</p>
          <StatusBadge
            status={item.status}
            enum={item.type === "heartbeat" ? "device_status" : "mo_status"}
            variant="dot"
            data-testid={`it-alert-${item.id}-badge`}
          />
        </div>
        <p className="text-foreground-muted truncate text-xs">{item.description}</p>
      </div>
      <span className="text-foreground-subtle shrink-0 text-xs tabular-nums">
        <Clock aria-hidden className="mr-1 inline-block size-3" />
        {timeAgo}
      </span>
    </div>
  );

  if (item.deviceId) {
    return (
      <Link
        href={`/admin/devices/${item.deviceId}`}
        className="contents"
        data-testid={`it-alert-${item.id}-link`}
      >
        {content}
      </Link>
    );
  }

  return content;
}

// ── Device Status Chart ────────────────────────────────────────────────

function DeviceStatusChart({
  data,
}: Readonly<{
  data: ReadonlyArray<Readonly<{ status: string; count: number }>>;
}>) {
  if (data.length === 0) {
    return (
      <div
        className="text-foreground-muted flex items-center justify-center py-12 text-sm"
        data-testid="it-device-chart-empty"
      >
        No devices registered
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Donut chart */}
      <div className="mx-auto h-40 w-40 shrink-0 sm:mx-0" data-testid="it-device-status-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data as Array<{ status: string; count: number }>}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="count"
              nameKey="status"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={getStatusColor(entry.status)} />
              ))}
            </Pie>
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const item = payload[0]!;
                return (
                  <div className="bg-popover text-popover-foreground rounded-md border px-3 py-1.5 text-xs shadow-md">
                    <span className="capitalize">{String(item.name)}</span>:{" "}
                    <span className="font-medium">{String(item.value)}</span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2" data-testid="it-device-chart-legend">
        {data.map((entry) => (
          <Link
            key={entry.status}
            href={`/admin/devices?status=${entry.status}`}
            className="hover:bg-background-subtle group flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
            data-testid={`it-device-legend-${entry.status}`}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: getStatusColor(entry.status) }}
              aria-hidden
            />
            <span className="text-foreground-muted group-hover:text-foreground text-sm capitalize">
              {entry.status.replaceAll("_", " ")}
            </span>
            <span className="text-foreground ml-auto text-sm font-medium tabular-nums">
              {entry.count}
            </span>
            <span className="text-foreground-subtle text-xs tabular-nums">
              ({total > 0 ? Math.round((entry.count / total) * 100) : 0}%)
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

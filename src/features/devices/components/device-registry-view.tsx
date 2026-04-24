"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { formatDistanceToNow, parseISO, isAfter, isBefore, subHours, addDays } from "date-fns";
import { Activity, Clock, Shield, Timer, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { DeviceCreateForm } from "@/features/devices/components/device-create-form";
import { DeviceTypePanel } from "@/features/devices/components/device-type-panel";
import type { DeviceListData, DeviceRow } from "@/features/devices/types/device";

// ── Constants ──────────────────────────────────────────────────────────

const DEVICE_STATUSES = ["online", "offline", "maintenance", "decommissioned"] as const;
type DeviceStatus = (typeof DEVICE_STATUSES)[number];
type StatusFilter = "all" | DeviceStatus;

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All Statuses",
  online: "Online",
  offline: "Offline",
  maintenance: "Maintenance",
  decommissioned: "Decommissioned",
};

// ── Columns ────────────────────────────────────────────────────────────

function buildColumns(): ColumnDef<DeviceRow, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
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
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} label={STATUS_LABELS[row.original.status]} />
      ),
    },
    {
      id: "zoneName",
      accessorKey: "zoneName",
      header: "Zone",
      cell: ({ row }) => (
        <span className="text-foreground-subtle text-sm">{row.original.zoneName ?? "—"}</span>
      ),
    },
    {
      id: "lastHeartbeatAt",
      accessorKey: "lastHeartbeatAt",
      header: "Last Heartbeat",
      cell: ({ row }) => {
        const ts = row.original.lastHeartbeatAt;
        if (!ts) return <span className="text-foreground-muted text-sm">Never</span>;
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
    {
      id: "warrantyExpiry",
      accessorKey: "warrantyExpiry",
      header: "Warranty",
      cell: ({ row }) => {
        const exp = row.original.warrantyExpiry;
        if (!exp) return <span className="text-foreground-muted text-sm">—</span>;
        const expDate = parseISO(exp);
        const now = new Date();
        const isExpired = !isAfter(expDate, now);
        const isExpiringSoon = !isExpired && isBefore(expDate, addDays(now, 30));
        if (isExpired) {
          return <Badge variant="destructive">Expired</Badge>;
        }
        if (isExpiringSoon) {
          return (
            <Badge
              variant="outline"
              className="border-amber-500 text-amber-600 dark:text-amber-400"
            >
              {exp}
            </Badge>
          );
        }
        return <span className="text-foreground-subtle text-sm">{exp}</span>;
      },
    },
    {
      id: "serialNumber",
      accessorKey: "serialNumber",
      header: "Serial",
      cell: ({ row }) => (
        <span className="text-foreground-muted font-mono text-xs">
          {row.original.serialNumber ?? "—"}
        </span>
      ),
      meta: {
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
      },
    },
  ];
}

// ── Component ──────────────────────────────────────────────────────────

type DeviceRegistryViewProps = Readonly<{
  data: DeviceListData;
  canWrite: boolean;
}>;

export function DeviceRegistryView({ data, canWrite }: DeviceRegistryViewProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);

  const statusFilter = useUrlString("status");
  const deviceTypeFilter = useUrlString("deviceType");
  // Note: search ("q") is managed internally by <UrlSearchInput param="q">
  const searchFilter = useUrlString("q");

  const activeStatus = (statusFilter.value ?? "all") as StatusFilter;

  // ── Client-side filtering ────────────────────────────────────────────
  const filteredDevices = React.useMemo(() => {
    let result = [...data.devices];
    if (activeStatus !== "all" && DEVICE_STATUSES.includes(activeStatus as DeviceStatus)) {
      result = result.filter((d) => d.status === activeStatus);
    }
    if (deviceTypeFilter.value) {
      result = result.filter((d) => d.deviceTypeId === deviceTypeFilter.value);
    }
    if (searchFilter.value) {
      const q = searchFilter.value.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.serialNumber?.toLowerCase().includes(q) ?? false) ||
          (d.assetTag?.toLowerCase().includes(q) ?? false) ||
          (d.ipAddress?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [data.devices, activeStatus, deviceTypeFilter.value, searchFilter.value]);

  const hasActiveFilters = Boolean(
    deviceTypeFilter.value || searchFilter.value || activeStatus !== "all",
  );

  const columns = React.useMemo(() => buildColumns(), []);

  const avgRtLabel =
    data.kpis.avgResponseTimeMs != null ? `${data.kpis.avgResponseTimeMs} ms` : "—";

  // Committed filter chip labels
  const activeStatusLabel = activeStatus !== "all" ? STATUS_LABELS[activeStatus] : null;
  const activeDeviceTypeLabel = deviceTypeFilter.value
    ? (data.deviceTypes.find((t) => t.id === deviceTypeFilter.value)?.displayName ?? "Unknown")
    : null;

  function clearAllFilters() {
    statusFilter.set(null);
    deviceTypeFilter.set(null);
    searchFilter.set(null);
  }

  // Status counts for select option labels
  const totalCount = data.devices.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Device Registry"
        description="Monitor and manage all physical devices in the IT estate."
        primaryAction={
          canWrite ? (
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="device-registry-create"
              size="sm"
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              Register Device
            </Button>
          ) : undefined
        }
      />

      {/* Main list frame — KPIs passed via kpis= slot (rendered above the card frame, matching IAM pattern) */}
      <FilterableDataTable
        data-testid="device-registry-table"
        hasActiveFilters={hasActiveFilters}
        kpis={
          <KpiCardRow data-testid="device-kpis">
            <KpiCard
              label="Stale Heartbeat (>1h)"
              value={data.kpis.staleHeartbeatCount}
              icon={<Activity className="size-4" />}
              emphasis={data.kpis.staleHeartbeatCount > 0 ? "accent" : "default"}
              data-testid="device-kpi-stale"
            />
            <KpiCard
              label="Warranty Expiring ≤30d"
              value={data.kpis.warrantyExpiringSoonCount}
              icon={<Shield className="size-4" />}
              emphasis={data.kpis.warrantyExpiringSoonCount > 0 ? "accent" : "default"}
              data-testid="device-kpi-warranty"
            />
            <KpiCard
              label="Under Active WO"
              value={data.kpis.underActiveWorkOrderCount}
              icon={<Clock className="size-4" />}
              data-testid="device-kpi-active-wo"
            />
            <KpiCard
              label="Avg Response Time"
              value={avgRtLabel}
              icon={<Timer className="size-4" />}
              data-testid="device-kpi-avg-rt"
            />
          </KpiCardRow>
        }
        toolbar={
          <FilterBar
            hasActiveFilters={hasActiveFilters}
            {...(hasActiveFilters ? { onClearAll: clearAllFilters } : {})}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search name, serial, asset tag, IP…"
                data-testid="device-search"
              />
            }
            controls={
              <>
                {/* Status filter */}
                <Select
                  value={activeStatus}
                  onValueChange={(v) => statusFilter.set(v === "all" ? null : v)}
                >
                  <SelectTrigger
                    className="h-8 min-w-[9rem] text-sm"
                    data-testid="device-filter-status"
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses ({totalCount})</SelectItem>
                    {DEVICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} data-testid={`device-filter-status-${s}`}>
                        {STATUS_LABELS[s]} ({data.statusCounts[s] ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Device Type filter */}
                <Select
                  value={deviceTypeFilter.value ?? "all"}
                  onValueChange={(v) => deviceTypeFilter.set(v === "all" ? null : v)}
                >
                  <SelectTrigger
                    className="h-8 min-w-[8rem] text-sm"
                    data-testid="device-filter-type"
                    aria-label="Filter by device type"
                  >
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {data.deviceTypes.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={t.id}
                        data-testid={`device-filter-type-${t.id}`}
                      >
                        {t.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            chips={
              activeStatusLabel != null || activeDeviceTypeLabel != null ? (
                <>
                  {activeStatusLabel != null && (
                    <FilterChip
                      name="Status:"
                      label={activeStatusLabel}
                      onRemove={() => statusFilter.set(null)}
                      data-testid="device-filter-status-chip"
                    />
                  )}
                  {activeDeviceTypeLabel != null && (
                    <FilterChip
                      name="Type:"
                      label={activeDeviceTypeLabel}
                      onRemove={() => deviceTypeFilter.set(null)}
                      data-testid="device-filter-type-chip"
                    />
                  )}
                </>
              ) : undefined
            }
          />
        }
        emptyState={
          hasActiveFilters
            ? {
                variant: "filtered-out" as const,
                title: "No matching devices",
                description: "Widen the search or clear a filter to see more devices.",
              }
            : {
                variant: "first-use" as const,
                title: "No devices registered",
                description: "Register your first device to start monitoring the IT estate.",
                ...(canWrite
                  ? {
                      action: (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setCreateOpen(true)}
                          data-testid="device-empty-cta"
                        >
                          Register Device
                        </Button>
                      ),
                    }
                  : {}),
              }
        }
        table={{
          data: filteredDevices,
          columns,
          mobileFieldPriority: ["name", "status", "deviceTypeName", "lastHeartbeatAt"],
          getRowId: (row) => row.id,
          onRowClick: (row) => router.push(`/admin/devices/${row.id}`),
          "data-testid": "device-table",
        }}
      />

      {/* Device Types collapsible panel */}
      <DeviceTypePanel deviceTypes={data.deviceTypes} canWrite={canWrite} />

      {/* Create form sheet */}
      {canWrite && (
        <DeviceCreateForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          deviceTypes={data.deviceTypes}
          zones={data.zones}
          vendors={data.vendors}
          vlans={data.vlans}
        />
      )}
    </div>
  );
}

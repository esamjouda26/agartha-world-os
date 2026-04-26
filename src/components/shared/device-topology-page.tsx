"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useRouter } from "@/i18n/navigation";
import { Cable, MapPin, Plus } from "lucide-react";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TreeNode } from "@/components/ui/tree-view";
import { TreeWithSidePanel } from "@/components/shared/tree-with-side-panel";

import type {
  TopologyData,
  TopologyDevice,
  TopologyLocation,
} from "@/features/devices/types/topology";

/**
 * DeviceTopologyPage — the shared organism for the device-topology
 * surface (frontend_spec.md:2740-2775).
 *
 * Pattern C (ADR-0007): caller is the RSC route — it fetches
 * `getDeviceTopology()` and injects via `data`. The component owns
 * client interactivity (location selection via nuqs, device selection,
 * tree expand/collapse) but never calls Supabase.
 *
 * Used by `/management/maintenance/device-topology` today; ready for
 * an `/admin/devices/topology` route to consume without duplication.
 */

export type DeviceTopologyPageProps = Readonly<{
  data: TopologyData;
  /**
   * Where the "Create Work Order" deep-link points. Differs by portal
   * (management vs admin once that lands). The component appends
   * `?target_ci_id=<deviceId>` so the orders page can pre-select the
   * device. Pass `null` to hide the CTA entirely.
   */
  createWorkOrderHref: Route | null;
  /** Page title — defaults to spec wording. */
  title?: string;
  /** Description override. */
  description?: string;
  "data-testid"?: string;
}>;

const DEFAULT_TITLE = "Device Topology";
const DEFAULT_DESCRIPTION =
  "Hierarchical device tree organized by location. Offline parents render their descendants as unreachable.";

export function DeviceTopologyPage({
  data,
  createWorkOrderHref,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  "data-testid": testId = "device-topology",
}: DeviceTopologyPageProps) {
  const router = useRouter();

  const firstLocationId = data.locations[0]?.id ?? null;
  const [locationId, setLocationId] = useQueryState(
    "loc",
    parseAsString
      .withDefault(firstLocationId ?? "")
      .withOptions({ clearOnDefault: true, shallow: true, history: "replace" }),
  );
  const [selectedDeviceId, setSelectedDeviceId] = useQueryState(
    "device",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, shallow: true, history: "replace" }),
  );

  // ── Build per-location device subset + tree nodes ──────────────────
  const activeLocationId = locationId || firstLocationId;

  const locationDevices = React.useMemo<ReadonlyArray<TopologyDevice>>(() => {
    if (!activeLocationId) return [];
    if (activeLocationId === "__unassigned__") {
      return data.devices.filter((d) => d.locationId === null);
    }
    return data.devices.filter((d) => d.locationId === activeLocationId);
  }, [data.devices, activeLocationId]);

  // ── Detect offline ancestry so unreachable descendants render dim
  const unreachableSet = React.useMemo<ReadonlySet<string>>(() => {
    const offlineParents = new Set<string>();
    const idToDevice = new Map<string, TopologyDevice>(locationDevices.map((d) => [d.id, d]));
    for (const d of locationDevices) {
      if (d.status === "offline") offlineParents.add(d.id);
    }
    const unreachable = new Set<string>();
    function walkUp(deviceId: string): boolean {
      const device = idToDevice.get(deviceId);
      if (!device) return false;
      if (offlineParents.has(deviceId)) return true;
      if (!device.parentDeviceId) return false;
      return walkUp(device.parentDeviceId);
    }
    for (const d of locationDevices) {
      if (d.status === "offline") continue; // self-marked already
      if (d.parentDeviceId && walkUp(d.parentDeviceId)) {
        unreachable.add(d.id);
      }
    }
    return unreachable;
  }, [locationDevices]);

  const treeNodes = React.useMemo<readonly TreeNode[]>(() => {
    const byParent = new Map<string | null, TopologyDevice[]>();
    for (const d of locationDevices) {
      const arr = byParent.get(d.parentDeviceId) ?? [];
      arr.push(d);
      byParent.set(d.parentDeviceId, arr);
    }

    function build(parentId: string | null): TreeNode[] {
      const children = byParent.get(parentId) ?? [];
      return children.map<TreeNode>((d) => {
        const grandchildren = build(d.id);
        const isUnreachable = unreachableSet.has(d.id);
        return {
          id: d.id,
          label: (
            <span className="flex items-center gap-2">
              <span className={isUnreachable ? "text-foreground-muted" : undefined}>{d.name}</span>
              {d.deviceTypeName ? (
                <span className="text-foreground-muted text-xs">· {d.deviceTypeName}</span>
              ) : null}
            </span>
          ),
          trailing: (
            <span className="flex items-center gap-1.5">
              {d.openWoCount > 0 ? (
                <span
                  className="text-status-warning-foreground bg-status-warning-soft border-status-warning-border rounded-full border px-1.5 py-0 text-[10px] font-medium tabular-nums"
                  aria-label={`${d.openWoCount} open work orders`}
                >
                  {d.openWoCount} WO
                </span>
              ) : null}
              {isUnreachable ? (
                <StatusBadge status="unreachable" tone="warning" />
              ) : (
                <StatusBadge status={d.status} enum="device_status" />
              )}
            </span>
          ),
          ...(grandchildren.length > 0 ? { children: grandchildren } : {}),
        };
      });
    }

    return build(null);
  }, [locationDevices, unreachableSet]);

  // Default expand top-level nodes for clarity.
  const defaultExpanded = React.useMemo<ReadonlySet<string>>(
    () => new Set(treeNodes.map((n) => n.id)),
    [treeNodes],
  );

  const selectedDevice = React.useMemo(
    () => locationDevices.find((d) => d.id === selectedDeviceId) ?? null,
    [locationDevices, selectedDeviceId],
  );

  // Reset selected device whenever the location changes to one that
  // doesn't contain it.
  React.useEffect(() => {
    if (selectedDevice === null && selectedDeviceId !== "") {
      void setSelectedDeviceId(null);
    }
  }, [selectedDevice, selectedDeviceId, setSelectedDeviceId]);

  return (
    <div className="flex flex-col gap-6" data-testid={testId}>
      <PageHeader title={title} description={description} data-testid={`${testId}-header`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-6">
        <LocationSidebar
          locations={data.locations}
          activeId={activeLocationId}
          onSelect={(id) => {
            void setLocationId(id);
            void setSelectedDeviceId(null);
          }}
          data-testid={`${testId}-sidebar`}
        />

        <div className="flex flex-col gap-4">
          {treeNodes.length === 0 ? (
            <EmptyState
              variant="first-use"
              title="No devices in this location"
              description="Devices appear here once they're commissioned and assigned to a zone in this location."
              icon={<Cable className="size-8" />}
              data-testid={`${testId}-empty`}
            />
          ) : (
            <TreeWithSidePanel
              treeHeading="Devices"
              tree={{
                nodes: treeNodes,
                defaultExpanded,
                selectedId: selectedDeviceId || null,
                onSelect: (id) => void setSelectedDeviceId(id),
                "data-testid": `${testId}-tree`,
              }}
              panelHeading={
                selectedDevice ? (
                  <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
                    Device detail
                  </p>
                ) : null
              }
              panelPlaceholder={
                <EmptyState
                  variant="first-use"
                  title="Select a device"
                  description="Pick a node on the left to see network details and maintenance vendor."
                  icon={<Cable className="size-8" />}
                  frame="none"
                  data-testid={`${testId}-panel-placeholder`}
                />
              }
              panel={
                selectedDevice ? (
                  <DeviceDetailPanel
                    device={selectedDevice}
                    createWorkOrderHref={createWorkOrderHref}
                    onCreateWorkOrder={(href) => router.push(href)}
                    data-testid={`${testId}-panel`}
                  />
                ) : null
              }
              data-testid={`${testId}-tree-with-panel`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Location sidebar ─────────────────────────────────────────────────────

function LocationSidebar({
  locations,
  activeId,
  onSelect,
  "data-testid": testId,
}: Readonly<{
  locations: ReadonlyArray<TopologyLocation>;
  activeId: string | null;
  onSelect: (id: string) => void;
  "data-testid"?: string;
}>) {
  if (locations.length === 0) {
    return (
      <aside
        data-testid={testId}
        className="border-border-subtle bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-xs"
      >
        <p className="text-foreground-muted text-sm">
          No locations registered. Add one under Settings → Locations.
        </p>
      </aside>
    );
  }
  return (
    <aside
      data-testid={testId}
      className="border-border-subtle bg-card flex flex-col gap-1 overflow-hidden rounded-xl border p-2 shadow-xs"
    >
      <p className="text-foreground-subtle px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
        Locations
      </p>
      <ul className="flex flex-col gap-0.5">
        {locations.map((loc) => {
          const isActive = loc.id === activeId;
          return (
            <li key={loc.id}>
              <button
                type="button"
                onClick={() => onSelect(loc.id)}
                aria-pressed={isActive}
                className={
                  isActive
                    ? "bg-primary/10 text-foreground flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm font-medium"
                    : "hover:bg-surface flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm"
                }
                data-testid={`${testId}-loc-${loc.id}`}
              >
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">{loc.name}</span>
                </span>
                <span className="text-foreground-muted flex items-center gap-2 text-xs">
                  <span className="tabular-nums">{loc.totalCount} devices</span>
                  {loc.offlineCount > 0 ? (
                    <span className="text-status-danger-foreground tabular-nums">
                      {loc.offlineCount} offline
                    </span>
                  ) : null}
                  {loc.maintenanceCount > 0 ? (
                    <span className="text-status-warning-foreground tabular-nums">
                      {loc.maintenanceCount} in WO
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

// ── Device detail panel ──────────────────────────────────────────────────

function DeviceDetailPanel({
  device,
  createWorkOrderHref,
  onCreateWorkOrder,
  "data-testid": testId,
}: Readonly<{
  device: TopologyDevice;
  createWorkOrderHref: Route | null;
  onCreateWorkOrder: (href: Route) => void;
  "data-testid"?: string;
}>) {
  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{device.name}</h2>
          <StatusBadge status={device.status} enum="device_status" />
        </div>
        {device.deviceTypeName ? (
          <p className="text-foreground-muted text-sm">
            {device.deviceTypeName}
            {device.zoneName ? ` · ${device.zoneName}` : ""}
            {device.locationName ? ` · ${device.locationName}` : ""}
          </p>
        ) : null}
      </header>

      <Separator />

      <MetadataList
        layout="grid"
        cols={2}
        items={[
          { label: "Manufacturer", value: device.manufacturer ?? "—" },
          { label: "Model", value: device.model ?? "—" },
          { label: "Serial number", value: device.serialNumber ?? "—" },
          { label: "Asset tag", value: device.assetTag ?? "—" },
          { label: "Firmware", value: device.firmwareVersion ?? "—" },
          { label: "VLAN", value: device.vlanName ?? "—" },
          { label: "IP address", value: device.ipAddress ?? "—" },
          { label: "MAC address", value: device.macAddress ?? "—" },
          { label: "Commissioned", value: formatDate(device.commissionDate) },
          { label: "Warranty expires", value: formatDate(device.warrantyExpiry) },
          { label: "Maintenance vendor", value: device.vendorName ?? "—" },
          { label: "Open work orders", value: String(device.openWoCount) },
        ]}
        data-testid={`${testId}-meta`}
      />

      {createWorkOrderHref ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onCreateWorkOrder(`${createWorkOrderHref}?target_ci_id=${device.id}` as Route)
          }
          data-testid={`${testId}-create-wo`}
        >
          <Plus aria-hidden className="size-4" /> Create Work Order
        </Button>
      ) : null}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(iso));
}

import type { Database } from "@/types/database";

export type DeviceStatus = Database["public"]["Enums"]["device_status"];

/**
 * Device topology data shape — consumed by the shared
 * `<DeviceTopologyPage>` organism on `/management/maintenance/device-
 * topology` (frontend_spec.md:2740-2775) and any future
 * `/admin/devices/topology` route.
 */
export type TopologyDevice = Readonly<{
  id: string;
  name: string;
  status: DeviceStatus;
  deviceTypeName: string | null;
  parentDeviceId: string | null;
  zoneId: string | null;
  zoneName: string | null;
  locationId: string | null;
  locationName: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  firmwareVersion: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  manufacturer: string | null;
  model: string | null;
  commissionDate: string | null;
  warrantyExpiry: string | null;
  vlanName: string | null;
  vendorName: string | null;
  openWoCount: number;
}>;

export type TopologyLocation = Readonly<{
  id: string;
  name: string;
  totalCount: number;
  onlineCount: number;
  offlineCount: number;
  maintenanceCount: number;
}>;

export type TopologyData = Readonly<{
  locations: ReadonlyArray<TopologyLocation>;
  devices: ReadonlyArray<TopologyDevice>;
}>;

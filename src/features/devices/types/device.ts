/**
 * View-model types for the Device Registry feature.
 * These extend DB-generated types with join-resolved display fields.
 * No raw DB rows cross the server→client boundary.
 */

export type DeviceStatus = "online" | "offline" | "maintenance" | "decommissioned";
export type HeartbeatStatus = "online" | "offline" | "degraded";

/** Flattened device row passed to the client DataTable. */
export type DeviceRow = Readonly<{
  id: string;
  name: string;
  /** Resolved display_name from device_types join. */
  deviceTypeName: string;
  deviceTypeId: string;
  status: DeviceStatus;
  /** Zone name (null when device is unzoned). */
  zoneName: string | null;
  zoneId: string | null;
  /** Latest heartbeat timestamp ISO string (null = never pinged). */
  lastHeartbeatAt: string | null;
  heartbeatStatus: HeartbeatStatus | null;
  /** Date string YYYY-MM-DD or null. */
  warrantyExpiry: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  /** Stringified INET. */
  ipAddress: string | null;
  /** Stringified MACADDR. */
  macAddress: string | null;
  vlanId: number | null;
  vlanName: string | null;
}>;

export type DeviceKpis = Readonly<{
  /** Devices whose latest heartbeat is > 1h ago (or never). */
  staleHeartbeatCount: number;
  /** Devices with warranty_expiry within the next 30 days. */
  warrantyExpiringSoonCount: number;
  /** Distinct device IDs under an active/scheduled maintenance order. */
  underActiveWorkOrderCount: number;
  /** Avg response_time_ms over last 24h. null = no data. */
  avgResponseTimeMs: number | null;
}>;

/** Full device list payload passed from RSC → client leaf. */
export type DeviceListData = Readonly<{
  devices: ReadonlyArray<DeviceRow>;
  kpis: DeviceKpis;
  /** Status → count map for tab badges. */
  statusCounts: Readonly<Record<string, number>>;
  /** All device types for filter dropdown + create form. */
  deviceTypes: ReadonlyArray<DeviceTypeOption>;
  /** All zones for create/edit form. */
  zones: ReadonlyArray<ZoneOption>;
  /** All active maintenance vendors for create/edit form. */
  vendors: ReadonlyArray<VendorOption>;
  /** All VLANs for create/edit form. */
  vlans: ReadonlyArray<VlanOption>;
}>;

export type DeviceTypeOption = Readonly<{
  id: string;
  name: string;
  displayName: string;
}>;

export type ZoneOption = Readonly<{
  id: string;
  name: string;
}>;

export type VendorOption = Readonly<{
  id: string;
  name: string;
}>;

export type VlanOption = Readonly<{
  vlanId: number;
  name: string;
}>;

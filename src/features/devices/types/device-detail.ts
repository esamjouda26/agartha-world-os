/**
 * View-model types for the Device Detail page.
 * Keeps raw DB rows off the server→client boundary.
 */

import type { DeviceStatus, HeartbeatStatus } from "@/features/devices/types/device";

export type DeviceDetail = Readonly<{
  id: string;
  name: string;
  status: DeviceStatus;
  deviceTypeName: string;
  deviceTypeId: string;
  serialNumber: string | null;
  assetTag: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  vlanId: number | null;
  vlanName: string | null;
  zoneName: string | null;
  zoneId: string | null;
  manufacturer: string | null;
  model: string | null;
  firmwareVersion: string | null;
  commissionDate: string | null;
  warrantyExpiry: string | null;
  maintenanceVendorId: string | null;
  createdAt: string;
  updatedAt: string | null;
}>;

export type HeartbeatEntry = Readonly<{
  id: string;
  status: HeartbeatStatus;
  responseTimeMs: number | null;
  recordedAt: string;
}>;

export type MaintenanceOrderEntry = Readonly<{
  id: string;
  status: string;
  topology: string;
  vendorName: string;
  maintenanceStart: string;
  maintenanceEnd: string;
  scope: string | null;
  completedAt: string | null;
}>;

export type DeviceDetailData = Readonly<{
  device: DeviceDetail;
  heartbeats: ReadonlyArray<HeartbeatEntry>;
  maintenanceOrders: ReadonlyArray<MaintenanceOrderEntry>;
}>;

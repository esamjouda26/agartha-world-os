import type { Database } from "@/types/database";

export type MaintenanceOrder = Database["public"]["Tables"]["maintenance_orders"]["Row"];
export type MoStatus = Database["public"]["Enums"]["mo_status"];
export type MoTopology = Database["public"]["Enums"]["mo_topology"];

/** Crew-portal sponsor view — `/crew/maintenance/orders`. */
export type WorkOrderView = Readonly<{
  id: string;
  topology: MoTopology;
  status: MoStatus | null;
  vendorId: string;
  vendorName: string;
  deviceId: string;
  deviceName: string;
  deviceLocation: string | null;
  maintenanceStart: string;
  maintenanceEnd: string;
  madLimitMinutes: number | null;
  sponsorId: string | null;
  vendorMacAddress: string | null;
  authorizedAt: string | null;
  completedAt: string | null;
}>;

// ── Management-portal types ─────────────────────────────────────────────

/** Section bucket on `/management/maintenance/orders` (nuqs `?section=`). */
export type OrdersSection = "live" | "queue" | "history";

/** A row on the management orders list — joined view of one work order. */
export type OrderListRow = Readonly<{
  id: string;
  topology: MoTopology;
  status: MoStatus;
  deviceId: string;
  deviceName: string;
  deviceLocation: string | null;
  vendorId: string;
  vendorName: string;
  sponsorId: string | null;
  sponsorName: string | null;
  maintenanceStart: string;
  maintenanceEnd: string;
  madLimitMinutes: number | null;
  scope: string | null;
  switchPort: string | null;
  networkGroup: string | null;
  vendorMacAddress: string | null;
  authorizedAt: string | null;
  completedAt: string | null;
  sponsorRemark: string | null;
  createdAt: string;
  updatedAt: string | null;
}>;

export type OrderListKpis = Readonly<{
  activeSessions: number;
  scheduled: number;
  overdue: number;
  completedThisWeek: number;
}>;

export type OrderSectionCounts = Readonly<{
  live: number;
  queue: number;
  history: number;
}>;

/** Form-context lookup data — devices, vendors, sponsors. */
export type OrderFormDevice = Readonly<{
  id: string;
  name: string;
  zoneName: string | null;
}>;

export type OrderFormVendor = Readonly<{
  id: string;
  name: string;
  specialization: string | null;
}>;

export type OrderFormSponsor = Readonly<{
  staffRecordId: string;
  displayName: string;
  employeeId: string | null;
  roleDisplayName: string | null;
}>;

export type OrderFormContext = Readonly<{
  devices: ReadonlyArray<OrderFormDevice>;
  vendors: ReadonlyArray<OrderFormVendor>;
  sponsors: ReadonlyArray<OrderFormSponsor>;
}>;

export type OrdersListData = Readonly<{
  rows: ReadonlyArray<OrderListRow>;
  kpis: OrderListKpis;
  counts: OrderSectionCounts;
  context: OrderFormContext;
}>;

// ── Vendor-registry types ──────────────────────────────────────────────

export type MaintenanceVendor =
  Database["public"]["Tables"]["maintenance_vendors"]["Row"];

export type VendorListRow = Readonly<{
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  specialization: string | null;
  description: string | null;
  isActive: boolean;
  openWoCount: number;
  lastWoAt: string | null;
}>;

export type VendorListKpis = Readonly<{
  available: number;
  busy: number;
  inactive: number;
}>;

export type VendorsListData = Readonly<{
  rows: ReadonlyArray<VendorListRow>;
  kpis: VendorListKpis;
}>;

// Device-topology types live in src/features/devices/types/topology.ts —
// the page is `it:r` (registered in src/features/devices/rbac.ts) and
// the shared `<DeviceTopologyPage>` organism consumes that type.

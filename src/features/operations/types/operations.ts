/** View-model types for the Operations Dashboard. */

export type ZoneOccupancy = Readonly<{
  zoneId: string;
  zoneName: string;
  locationName: string | null;
  currentOccupancy: number;
  capacity: number;
  /** 0-100 */
  loadPct: number;
}>;

export type IncidentCategoryGroup =
  | "safety"
  | "medical"
  | "security"
  | "guest"
  | "structural"
  | "equipment"
  | "other";

export type IncidentGroupCount = Readonly<{
  group: IncidentCategoryGroup;
  label: string;
  open: number;
  resolvedInPeriod: number;
}>;

export type DailyIncidentCount = Readonly<{
  date: string;
  opened: number;
  resolved: number;
}>;

export type MaintenanceWORow = Readonly<{
  id: string;
  status: string;
  topology: string;
  deviceName: string;
  zoneName: string | null;
  vendorName: string;
  maintenanceStart: string;
  maintenanceEnd: string;
}>;

export type SlotUtilDay = Readonly<{
  date: string;
  utilPct: number;
  bookedCount: number;
  capacity: number;
}>;

export type OperationsDashboardData = Readonly<{
  periodFrom: string;
  periodTo: string;

  // Live occupancy (always real-time, not period-filtered)
  totalOccupancy: number;
  totalCapacity: number;
  zones: ReadonlyArray<ZoneOccupancy>;

  // Incident summary
  incidentGroups: ReadonlyArray<IncidentGroupCount>;
  avgResolutionMs: number | null;
  incidentTrend: ReadonlyArray<DailyIncidentCount>;

  // Maintenance impact
  activeWOs: ReadonlyArray<MaintenanceWORow>;
  scheduledWOs: ReadonlyArray<MaintenanceWORow>;

  // Capacity utilization
  slotUtilization: ReadonlyArray<SlotUtilDay>;
}>;

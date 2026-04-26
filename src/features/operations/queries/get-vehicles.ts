import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VehicleStatus } from "@/features/operations/schemas/vehicle";

export type VehicleRow = Readonly<{
  id: string;
  name: string;
  plate: string | null;
  vehicleType: string | null;
  status: VehicleStatus;
  zoneId: string | null;
  zoneName: string | null;
  createdAt: string;
  nextScheduledWo: string | null;
  lastMaintenanceDate: string | null;
}>;

export type ZoneOption = Readonly<{ id: string; name: string }>;

export type VehicleKpis = Readonly<{
  activeCount: number;
  maintenanceCount: number;
  retiredCount: number;
  nextScheduledWoDate: string | null;
}>;

export type VehiclePageData = Readonly<{
  vehicles: VehicleRow[];
  zones: ZoneOption[];
  kpis: VehicleKpis;
}>;

export const getVehicles = cache(async (): Promise<VehiclePageData> => {
  const supabase = await createSupabaseServerClient();

  const [vResult, zResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, name, plate, vehicle_type, status, zone_id, created_at, zones(name), maintenance_orders(scheduled_date, actual_end_time, status)")
      .order("name", { ascending: true }),
    supabase
      .from("zones")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (vResult.error) throw vResult.error;
  if (zResult.error) throw zResult.error;

  const vehicles: VehicleRow[] = (vResult.data ?? []).map((r) => {
    const orders = r.maintenance_orders as unknown as Array<{ scheduled_date: string; actual_end_time: string | null; status: string }> | null;
    let nextScheduledWo: string | null = null;
    let lastMaintenanceDate: string | null = null;

    if (orders && orders.length > 0) {
      const pending = orders.filter((o) => o.status === "pending" || o.status === "open" || o.status === "scheduled").map(o => o.scheduled_date).sort();
      if (pending.length > 0) nextScheduledWo = pending[0] ?? null;

      const completed = orders.filter((o) => o.status === "completed" && o.actual_end_time).map(o => o.actual_end_time as string).sort().reverse();
      if (completed.length > 0) lastMaintenanceDate = completed[0] ?? null;
    }

    return {
      id: r.id,
      name: r.name,
      plate: r.plate,
      vehicleType: r.vehicle_type,
      status: (r.status ?? "active") as VehicleStatus,
      zoneId: r.zone_id,
      zoneName: (r.zones as unknown as { name: string } | null)?.name ?? null,
      createdAt: r.created_at,
      nextScheduledWo,
      lastMaintenanceDate,
    };
  });

  let activeCount = 0, maintenanceCount = 0, retiredCount = 0;
  let nextScheduledWoDate: string | null = null;

  for (const v of vehicles) {
    if (v.status === "active") activeCount++;
    else if (v.status === "maintenance") maintenanceCount++;
    else if (v.status === "retired") retiredCount++;

    if (v.nextScheduledWo) {
      if (!nextScheduledWoDate || v.nextScheduledWo < nextScheduledWoDate) {
        nextScheduledWoDate = v.nextScheduledWo;
      }
    }
  }

  return {
    vehicles,
    zones: (zResult.data ?? []).map((z) => ({ id: z.id, name: z.name })),
    kpis: { activeCount, maintenanceCount, retiredCount, nextScheduledWoDate },
  };
});

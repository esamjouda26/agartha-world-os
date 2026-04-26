import { z } from "zod";

export const VEHICLE_STATUSES = ["active", "maintenance", "retired"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Active",
  maintenance: "In Maintenance",
  retired: "Retired",
};

export const createVehicleSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  plate: z.string().max(20).nullable().default(null),
  vehicleType: z.string().max(100).nullable().default(null),
  status: z.enum(VEHICLE_STATUSES).default("active"),
  zoneId: z.string().uuid().nullable().default(null),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.extend({
  id: z.string().uuid(),
});

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

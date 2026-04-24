import { z } from "zod";

// Zod 4's `z.string().uuid()` enforces strict RFC-9562 UUIDs and rejects
// seeded IDs with non-standard version nibbles. Use `z.guid()` for FK
// validation — shape only, not RFC compliance. See memory: feedback_zod_uuid_trap.md
const uuid = z.guid();

export const createDeviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  deviceTypeId: uuid,
  serialNumber: z.string().max(255).optional(),
  assetTag: z.string().max(255).optional(),
  zoneId: uuid.optional(),
  ipAddress: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, "Invalid IP address")
    .optional()
    .or(z.literal("")),
  macAddress: z
    .string()
    .regex(/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/, "Invalid MAC address")
    .optional()
    .or(z.literal("")),
  vlanId: z.number().int().positive().optional(),
  parentDeviceId: uuid.optional(),
  manufacturer: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  firmwareVersion: z.string().max(255).optional(),
  commissionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  warrantyExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  maintenanceVendorId: uuid.optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

export const updateDeviceSchema = z.object({
  id: uuid,
  name: z.string().min(1, "Name is required").max(255),
  deviceTypeId: uuid,
  serialNumber: z.string().max(255).optional(),
  assetTag: z.string().max(255).optional(),
  zoneId: uuid.optional(),
  ipAddress: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, "Invalid IP address")
    .optional()
    .or(z.literal("")),
  macAddress: z
    .string()
    .regex(/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/, "Invalid MAC address")
    .optional()
    .or(z.literal("")),
  vlanId: z.number().int().positive().optional(),
  manufacturer: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  firmwareVersion: z.string().max(255).optional(),
  commissionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  warrantyExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  maintenanceVendorId: uuid.optional(),
});

export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;

export const createDeviceTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Key is required")
    .max(100)
    .regex(/^[a-z_]+$/, "Lowercase letters and underscores only"),
  displayName: z.string().min(1, "Display name is required").max(255),
});

export type CreateDeviceTypeInput = z.infer<typeof createDeviceTypeSchema>;

export const updateDeviceTypeSchema = z.object({
  id: uuid,
  displayName: z.string().min(1, "Display name is required").max(255),
});

export type UpdateDeviceTypeInput = z.infer<typeof updateDeviceTypeSchema>;

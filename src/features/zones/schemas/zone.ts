import { z } from "zod";

const uuid = z.guid();

// ── Location schemas ────────────────────────────────────────────────────

export const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  orgUnitId: uuid.optional(),
  isActive: z.boolean(),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  id: uuid,
  name: z.string().min(1, "Name is required").max(255),
  orgUnitId: uuid.optional(),
  isActive: z.boolean(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ── Zone schemas ────────────────────────────────────────────────────────

export const createZoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  locationId: uuid,
  isActive: z.boolean(),
});
export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = z.object({
  id: uuid,
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  locationId: uuid,
  isActive: z.boolean(),
});
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

// ── Category assignment schemas ─────────────────────────────────────────

export const assignCategoriesSchema = z.object({
  locationId: uuid,
  categoryIds: z.array(uuid).min(1),
});
export type AssignCategoriesInput = z.infer<typeof assignCategoriesSchema>;

export const unassignCategoriesSchema = z.object({
  locationId: uuid,
  categoryIds: z.array(uuid).min(1),
});
export type UnassignCategoriesInput = z.infer<typeof unassignCategoriesSchema>;

import { z } from "zod";

/**
 * Zod schema for POS point create/edit form.
 *
 * Schema ref: init_schema.sql:1079 — pos_points
 * RLS: INSERT requires system:c, UPDATE requires system:u (init_schema.sql:1285-1289)
 *
 * Using z.guid() per memory: Zod 4 z.string().uuid() rejects seeded IDs
 * with version nibble 0 — always use z.guid().
 *
 * No .default() to prevent input/output type mismatch with exactOptionalPropertyTypes.
 */
export const upsertPosPointSchema = z.object({
  id: z.guid().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be ≤ 100 characters"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be ≤ 100 characters"),
  locationId: z.guid("Location is required"),
  isActive: z.boolean(),
});

export type UpsertPosPointInput = z.infer<typeof upsertPosPointSchema>;

import { z } from "zod";

/**
 * Zod schemas for modifier group, modifier option, and assignment mutations.
 *
 * Schema refs:
 *   init_schema.sql:3049 — pos_modifier_groups
 *   init_schema.sql:3063 — pos_modifier_options
 *   init_schema.sql:3080 — material_modifier_groups
 *
 * RLS: INSERT requires pos:c, UPDATE requires pos:u for all three tables.
 * No .default() — avoids input/output mismatch with exactOptionalPropertyTypes.
 */

export const upsertModifierGroupSchema = z.object({
  id: z.guid().optional(),
  name: z.string().min(1, "Name is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(100),
  minSelections: z.number().int().min(0),
  maxSelections: z.number().int().min(1, "Max selections must be at least 1"),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});

export type UpsertModifierGroupInput = z.infer<typeof upsertModifierGroupSchema>;

export const upsertModifierOptionSchema = z.object({
  id: z.guid().optional(),
  groupId: z.guid(),
  name: z.string().min(1, "Name is required").max(100),
  priceDelta: z.number(),
  materialId: z.guid().optional(),
  quantityDelta: z.number(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});

export type UpsertModifierOptionInput = z.infer<typeof upsertModifierOptionSchema>;

export const syncModifierAssignmentsSchema = z.object({
  materialId: z.guid(),
  /** Full desired set of modifier group IDs for this material. */
  modifierGroupIds: z.array(z.guid()),
});

export type SyncModifierAssignmentsInput = z.infer<typeof syncModifierAssignmentsSchema>;

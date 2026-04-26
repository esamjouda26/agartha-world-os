import { z } from "zod";

/**
 * Zod schema for display category create/edit.
 *
 * Schema ref: init_schema.sql:2154 — display_categories
 * UNIQUE (pos_point_id, name) — enforced by DB constraint.
 * RLS: INSERT requires pos:c, UPDATE requires pos:u (init_schema.sql:2388-2391).
 *
 * No .default() — avoids input/output type mismatch with exactOptionalPropertyTypes.
 */
export const upsertDisplayCategorySchema = z.object({
  id: z.guid().optional(),
  posPointId: z.guid(),
  name: z.string().min(1, "Name is required").max(100),
  sortOrder: z.number().int().min(0),
});

export type UpsertDisplayCategoryInput = z.infer<typeof upsertDisplayCategorySchema>;

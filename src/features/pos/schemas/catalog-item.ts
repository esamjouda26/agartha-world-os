import { z } from "zod";

/**
 * Zod schema for catalog item (material_sales_data) create/edit.
 *
 * Schema ref: init_schema.sql:2168 — material_sales_data
 * Composite PK: (material_id, pos_point_id) — no separate id column.
 * RLS: INSERT requires pos:c, UPDATE requires pos:u (init_schema.sql:2376-2380).
 *
 * sellingPrice is submitted as a decimal MYR value from the form.
 * The action converts to/from integer cents at boundaries.
 * No .default() — avoids input/output type mismatch with exactOptionalPropertyTypes.
 */
export const upsertCatalogItemSchema = z.object({
  materialId: z.guid(),
  posPointId: z.guid(),
  displayName: z.string().max(200).optional(),
  /** Form value in MYR (decimal). e.g. 15.50 */
  sellingPrice: z.number().min(0, "Price must be non-negative"),
  displayCategoryId: z.guid().optional(),
  imageUrl: z.string().url("Invalid URL").max(2000).optional(),
  allergens: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  isUpdate: z.boolean(),
});

export type UpsertCatalogItemInput = z.infer<typeof upsertCatalogItemSchema>;

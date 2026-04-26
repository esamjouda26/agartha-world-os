import { z } from "zod";

/**
 * Zod schema for price_list_item create/edit form.
 *
 * Schema ref: init_schema.sql:2277 — price_list_items
 * UNIQUE INDEX (price_list_id, material_id, COALESCE(pos_point_id, '00..0')) — DB-enforced
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2431-2435)
 *
 * unitPrice submitted as decimal MYR; stored as NUMERIC.
 * No .default() — avoids input/output mismatch with exactOptionalPropertyTypes.
 */
export const upsertPriceListItemSchema = z.object({
  id: z.guid().optional(),
  priceListId: z.guid(),
  materialId: z.guid(),
  posPointId: z.guid().optional(),
  /** Form value in MYR (decimal). e.g. 15.50 */
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  minQty: z.number().min(0.0001, "Min qty must be positive"),
});

export type UpsertPriceListItemInput = z.infer<typeof upsertPriceListItemSchema>;

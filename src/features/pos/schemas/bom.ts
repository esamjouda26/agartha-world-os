import { z } from "zod";

/**
 * Zod schemas for BOM (bill_of_materials) and bom_components mutations.
 *
 * Schema refs:
 *   init_schema.sql:2225 — bill_of_materials
 *   init_schema.sql:2248 — bom_components
 *
 * Status lifecycle: draft → active → obsolete (CHECK constraint).
 * Partial unique idx idx_bom_one_active_default (status='active' AND is_default=TRUE).
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2398-2402).
 *
 * No .default() — avoids input/output mismatch with exactOptionalPropertyTypes.
 */

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const BOM_STATUSES = ["draft", "active", "obsolete"] as const;
export type BomStatus = (typeof BOM_STATUSES)[number];

export const createBomSchema = z
  .object({
    parentMaterialId: z.guid(),
    version: z.number().int().min(1, "Version must be ≥ 1"),
    effectiveFrom: dateString,
    effectiveTo: dateString.optional().or(z.literal("")),
    isDefault: z.boolean(),
  })
  .refine(
    (d) => !d.effectiveTo || d.effectiveTo === "" || d.effectiveTo >= d.effectiveFrom,
    { message: "End date must be on/after start date", path: ["effectiveTo"] },
  );

export type CreateBomInput = z.infer<typeof createBomSchema>;

export const cloneBomSchema = z.object({
  sourceBomId: z.guid(),
  version: z.number().int().min(1),
});

export type CloneBomInput = z.infer<typeof cloneBomSchema>;

export const activateBomSchema = z.object({
  bomId: z.guid(),
});

export type ActivateBomInput = z.infer<typeof activateBomSchema>;

export const upsertBomComponentSchema = z.object({
  id: z.guid().optional(),
  bomId: z.guid(),
  componentMaterialId: z.guid(),
  quantity: z.number().min(0.0001, "Quantity must be > 0"),
  scrapPct: z.number().min(0).max(99.99, "Scrap % must be < 100"),
  isPhantom: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type UpsertBomComponentInput = z.infer<typeof upsertBomComponentSchema>;

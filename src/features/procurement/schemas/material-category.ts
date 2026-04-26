import { z } from "zod";

/**
 * Zod schemas for `material_categories` CRUD + the
 * `location_allowed_categories` junction. Cross-domain page lives at
 * `/management/categories` (procurement OR pos:c) so the schemas live in
 * the procurement feature module per the principal-domain convention.
 *
 * Mirrors columns from `init_schema.sql:1049-1067`.
 */

const codePattern = /^[a-z][a-z0-9_]*$/;

const valuationEnum = z.enum(["standard", "moving_avg", "fifo"]);

// ── Create ────────────────────────────────────────────────────────────────

export const createMaterialCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50, "Code too long")
    .regex(
      codePattern,
      "Lowercase letters, digits, and underscores only; must start with a letter",
    ),
  parentId: z.guid().nullable(),
  isBomEligible: z.boolean(),
  isConsumable: z.boolean(),
  defaultValuation: valuationEnum.nullable(),
  accountingCategory: z
    .string()
    .trim()
    .max(100, "Accounting category too long")
    .nullable(),
  sortOrder: z
    .number()
    .int("Must be an integer")
    .min(0, "Must be ≥ 0")
    .max(99999, "Out of range"),
  isActive: z.boolean(),
});

export type CreateMaterialCategoryInput = z.infer<
  typeof createMaterialCategorySchema
>;

// ── Update ────────────────────────────────────────────────────────────────

/**
 * Update intentionally omits `parentId` and `code` because changing either
 * would require recomputing the ltree `path` of every descendant. That is
 * out of scope for this surface; v1 disallows re-parenting and re-coding
 * after creation.
 */
export const updateMaterialCategorySchema = z.object({
  categoryId: z.guid(),
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  isBomEligible: z.boolean(),
  isConsumable: z.boolean(),
  defaultValuation: valuationEnum.nullable(),
  accountingCategory: z
    .string()
    .trim()
    .max(100, "Accounting category too long")
    .nullable(),
  sortOrder: z
    .number()
    .int("Must be an integer")
    .min(0, "Must be ≥ 0")
    .max(99999, "Out of range"),
  isActive: z.boolean(),
});

export type UpdateMaterialCategoryInput = z.infer<
  typeof updateMaterialCategorySchema
>;

// ── Junction: category ↔ allowed locations ───────────────────────────────
//
// Page selects a category and edits which locations allow it; underlying
// junction row is (location_id, category_id).

export const updateCategoryAllowedLocationsSchema = z
  .object({
    categoryId: z.guid(),
    addLocationIds: z.array(z.guid()).max(50, "Too many locations at once"),
    removeLocationIds: z.array(z.guid()).max(50, "Too many locations at once"),
  })
  .refine(
    (v) => v.addLocationIds.length + v.removeLocationIds.length > 0,
    { message: "Nothing to apply", path: ["addLocationIds"] },
  );

export type UpdateCategoryAllowedLocationsInput = z.infer<
  typeof updateCategoryAllowedLocationsSchema
>;

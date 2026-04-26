import { z } from "zod";

/**
 * Zod schemas for material mutations.
 * Used by both client-side react-hook-form and Server Action validation.
 */

/** Lenient UUID — accepts any 8-4-4-4-12 hex string (seed UUIDs). */
const uuidField = (msg?: string) =>
  z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    msg ?? "Invalid UUID",
  );

const MATERIAL_TYPES = [
  "raw",
  "semi_finished",
  "finished",
  "trading",
  "consumable",
  "service",
] as const;

const VALUATION_METHODS = ["standard", "moving_avg", "fifo"] as const;

// ── Create Material ───────────────────────────────────────────────────

export const createMaterialSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().max(100).optional().or(z.literal("")),
  barcode: z.string().max(100).optional().or(z.literal("")),
  materialType: z.enum(MATERIAL_TYPES, {
    message: "Material type is required",
  }),
  categoryId: uuidField("Select a category"),
  baseUnitId: uuidField("Select a base unit"),
  reorderPoint: z.coerce.number().nonnegative("Must be ≥ 0").default(0),
  safetyStock: z.coerce.number().nonnegative("Must be ≥ 0").default(0),
  standardCost: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  valuationMethod: z.enum(VALUATION_METHODS).default("moving_avg"),
  shelfLifeDays: z.coerce.number().int().positive().optional(),
  storageConditions: z.string().max(500).optional().or(z.literal("")),
  weightKg: z.coerce.number().nonnegative().optional(),
  isReturnable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

// ── Update Material ───────────────────────────────────────────────────

/**
 * Update material schema — all fields optional except id.
 * Spec: frontend_spec.md §3b `/management/procurement/[id]` Info tab.
 * Fields: name, sku, barcode, material_type, category_id, base_unit_id,
 *   reorder_point (CHECK >= 0), safety_stock (CHECK >= 0), standard_cost,
 *   valuation_method, shelf_life_days, storage_conditions, weight_kg,
 *   is_returnable, is_active.
 */
export const updateMaterialSchema = z.object({
  id: uuidField("Material ID is required"),
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().max(100).optional().or(z.literal("")),
  barcode: z.string().max(100).optional().or(z.literal("")),
  materialType: z.enum(MATERIAL_TYPES, {
    message: "Material type is required",
  }),
  categoryId: uuidField("Select a category"),
  baseUnitId: uuidField("Select a base unit"),
  reorderPoint: z.coerce.number().nonnegative("Must be ≥ 0").default(0),
  safetyStock: z.coerce.number().nonnegative("Must be ≥ 0").default(0),
  standardCost: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  valuationMethod: z.enum(VALUATION_METHODS).default("moving_avg"),
  shelfLifeDays: z.coerce.number().int().positive().optional(),
  storageConditions: z.string().max(500).optional().or(z.literal("")),
  weightKg: z.coerce.number().nonnegative().optional(),
  isReturnable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

// ── Upsert Supplier Assignment ────────────────────────────────────────

/**
 * Spec: frontend_spec.md §3b `/management/procurement/[id]` Suppliers tab.
 * Fields: supplier_id (FK), supplier_sku, cost_price (CHECK >= 0),
 *   purchase_unit_id (FK), lead_time_days (CHECK >= 0), min_order_qty,
 *   is_default toggle.
 * Zod rule: only one row per material can have is_default = true
 *   (enforced by partial unique index `idx_material_procurement_one_default`).
 */
export const upsertSupplierAssignmentSchema = z.object({
  materialId: uuidField("Material ID is required"),
  supplierId: uuidField("Select a supplier"),
  supplierSku: z.string().max(100).optional().or(z.literal("")),
  costPrice: z.coerce.number().nonnegative("Cost price must be ≥ 0"),
  purchaseUnitId: uuidField("Select a purchase unit"),
  leadTimeDays: z.coerce.number().int().nonnegative("Lead time must be ≥ 0").default(0),
  minOrderQty: z.coerce.number().nonnegative("Min order qty must be ≥ 0").default(1),
  isDefault: z.boolean().default(false),
});

export type UpsertSupplierAssignmentInput = z.infer<
  typeof upsertSupplierAssignmentSchema
>;

// ── Upsert UOM Conversion ─────────────────────────────────────────────

/**
 * Spec: frontend_spec.md §3b `/management/procurement/[id]` UOM tab.
 * Fields: from_unit_id, to_unit_id, factor (CHECK > 0).
 * material_id is nullable — NULL = global conversion.
 */
export const upsertUomConversionSchema = z.object({
  /** NULL for edit of existing, provided for create. */
  id: uuidField().optional(),
  materialId: uuidField("Material ID is required").optional(),
  fromUnitId: uuidField("Select from unit"),
  toUnitId: uuidField("Select to unit"),
  factor: z.coerce.number().positive("Factor must be > 0"),
});

export type UpsertUomConversionInput = z.infer<
  typeof upsertUomConversionSchema
>;

// ── Create Draft POs ──────────────────────────────────────────────────

/**
 * Spec: frontend_spec.md §3b `/management/procurement/reorder` INTERACTIONS.
 * WF-9: groups selected materials by default supplier → creates one
 *   purchase_orders (status = 'draft', supplier_id, receiving_location_id)
 *   per supplier + purchase_order_items per material.
 */
export const createDraftPosSchema = z.object({
  receivingLocationId: uuidField("Select a receiving location"),
  items: z
    .array(
      z.object({
        materialId: uuidField("Material ID is required"),
        supplierId: uuidField("Supplier ID is required"),
        supplierName: z.string().min(1),
        orderQty: z.coerce.number().positive("Order qty must be > 0"),
        unitPrice: z.coerce.number().nonnegative("Unit price must be ≥ 0"),
      }),
    )
    .min(1, "Select at least one material"),
});

export type CreateDraftPosInput = z.infer<typeof createDraftPosSchema>;

export { MATERIAL_TYPES, VALUATION_METHODS };

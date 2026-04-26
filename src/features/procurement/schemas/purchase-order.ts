import { z } from "zod";

/**
 * Zod schemas for purchase order mutations.
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders`
 */

const uuidField = (msg?: string) =>
  z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    msg ?? "Invalid UUID",
  );

// ── Create Purchase Order ─────────────────────────────────────────────

/**
 * Spec INTERACTIONS: "Create: form → Server Action → INSERT purchase_orders
 *   (supplier_id, receiving_location_id, order_date, expected_delivery_date, notes)"
 */
export const createPurchaseOrderSchema = z.object({
  supplierId: uuidField("Select a supplier"),
  receivingLocationId: uuidField("Select a receiving location"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CreatePurchaseOrderInput = z.infer<
  typeof createPurchaseOrderSchema
>;

// ── Mark as Sent ──────────────────────────────────────────────────────

/**
 * Spec INTERACTIONS: "Status transitions: draft → sent (mark as sent)"
 */
export const markPoSentSchema = z.object({
  poId: uuidField("PO ID is required"),
});

export type MarkPoSentInput = z.infer<typeof markPoSentSchema>;

// ── Bulk Mark as Sent ─────────────────────────────────────────────────

/**
 * Spec INTERACTIONS: "Bulk 'Mark as Sent': select multiple draft POs → bulk action"
 */
export const bulkMarkPoSentSchema = z.object({
  poIds: z
    .array(uuidField("PO ID is required"))
    .min(1, "Select at least one PO"),
});

export type BulkMarkPoSentInput = z.infer<typeof bulkMarkPoSentSchema>;

// ── Update PO (draft only) ────────────────────────────────────────────

/**
 * Spec INTERACTIONS: "Edit PO (draft only): fields — expected_delivery_date,
 *   notes → Server Action → UPDATE purchase_orders"
 */
export const updatePurchaseOrderSchema = z.object({
  poId: uuidField("PO ID is required"),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

// ── Add PO Line Item (draft only) ─────────────────────────────────────

/**
 * Spec INTERACTIONS: "Add line items (draft only): material_id, expected_qty,
 *   unit_price → Server Action → INSERT purchase_order_items"
 */
export const addPoLineItemSchema = z.object({
  poId: uuidField("PO ID is required"),
  materialId: uuidField("Select a material"),
  expectedQty: z.coerce.number().positive("Expected qty must be > 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be ≥ 0"),
});

export type AddPoLineItemInput = z.infer<typeof addPoLineItemSchema>;

// ── Remove PO Line Item (draft only) ──────────────────────────────────

/**
 * Spec INTERACTIONS: "Remove line item (draft only): delete button per row
 *   → confirmation → Server Action → DELETE purchase_order_items"
 */
export const removePoLineItemSchema = z.object({
  lineItemId: uuidField("Line item ID is required"),
});

export type RemovePoLineItemInput = z.infer<typeof removePoLineItemSchema>;

// ── Update PO Status ──────────────────────────────────────────────────

/**
 * Spec INTERACTIONS:
 *   - "Mark as sent: button → UPDATE status = 'sent'"
 *   - "Force complete: button → UPDATE status = 'completed'"
 *   - "Cancel: button → UPDATE status = 'cancelled'"
 */
export const updatePoStatusSchema = z.object({
  poId: uuidField("PO ID is required"),
  status: z.enum(["sent", "completed", "cancelled"]),
});

export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>;


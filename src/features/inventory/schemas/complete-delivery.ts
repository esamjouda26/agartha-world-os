import { z } from "zod";

/**
 * Zod schema for marking a material requisition as delivered.
 * Each item records the actual quantity delivered (may differ from requested).
 */
export const completeDeliverySchema = z.object({
  requisition_id: z.string().min(1, "Requisition ID is required"),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, "Item ID is required"),
        delivered_qty: z
          .number({ message: "Quantity must be a number" })
          .nonnegative("Delivered quantity cannot be negative"),
      }),
    )
    .min(1, "At least one item is required"),
});

export type CompleteDeliveryInput = z.infer<typeof completeDeliverySchema>;

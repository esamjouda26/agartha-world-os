import { z } from "zod";

/**
 * Zod schema for recording received quantities against a purchase order.
 * Each item records the physically received quantity for that PO line.
 */
export const receivePoSchema = z.object({
  po_id: z.string().min(1, "Purchase order ID is required"),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, "Item ID is required"),
        received_qty: z
          .number({ message: "Quantity must be a number" })
          .nonnegative("Received quantity cannot be negative"),
      }),
    )
    .min(1, "At least one item is required"),
});

export type ReceivePoInput = z.infer<typeof receivePoSchema>;

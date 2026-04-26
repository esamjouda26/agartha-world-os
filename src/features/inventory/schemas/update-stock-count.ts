import { z } from "zod";

/**
 * Zod schema for submitting physical counts during a stock reconciliation.
 * Blind-count model: crew enter physical_qty only; system_qty comparison
 * is performed server-side.
 */
export const updateStockCountSchema = z.object({
  reconciliation_id: z.string().min(1, "Reconciliation ID is required"),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, "Item ID is required"),
        physical_qty: z
          .number({ message: "Quantity must be a number" })
          .nonnegative("Physical quantity cannot be negative"),
      }),
    )
    .min(1, "At least one item count is required"),
});

export type UpdateStockCountInput = z.infer<typeof updateStockCountSchema>;

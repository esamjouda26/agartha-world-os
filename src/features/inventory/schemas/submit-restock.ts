import { z } from "zod";

import { RESTOCK_MAX_ITEMS } from "@/features/inventory/constants";

/**
 * Zod schema for the crew restock form.
 * Validated on both client (react-hook-form) and server (Server Action).
 */
export const submitRestockSchema = z.object({
  to_location_id: z.string().min(1, "Destination location is required"),
  items: z
    .array(
      z.object({
        material_id: z.string().min(1, "Material is required"),
        requested_qty: z
          .number({ message: "Quantity must be a number" })
          .positive("Quantity must be greater than zero"),
      }),
    )
    .min(1, "At least one item is required")
    .max(RESTOCK_MAX_ITEMS, `Maximum ${RESTOCK_MAX_ITEMS} items per request`),
  requester_remark: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type SubmitRestockInput = z.infer<typeof submitRestockSchema>;

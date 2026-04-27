import { z } from "zod";

import { RESTOCK_MAX_ITEMS } from "@/features/inventory/constants";

/**
 * Zod schema for the crew restock form.
 * Validated on both client (react-hook-form) and server (Server Action).
 */
export const submitRestockSchema = z.object({
  /** Runners provide the source location; non-runners omit this (server
   *  auto-resolves to the canonical Warehouse location). */
  from_location_id: z.string().min(1).optional(),
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
  /** When true the action auto-assigns the requisition to the submitter
   *  (status → in_progress, assigned_to → auth user). */
  is_runner: z.boolean().optional(),
});

export type SubmitRestockInput = z.infer<typeof submitRestockSchema>;

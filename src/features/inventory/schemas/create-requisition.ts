import { z } from "zod";

import { MANAGER_REQUISITION_MAX_ITEMS } from "@/features/inventory/constants";

/**
 * Zod schema for the manager-side create-requisition flow at
 * `/management/inventory/requisitions`.
 *
 * Mirrors columns from `init_schema.sql:2771-2798`. Per WF-10
 * (`operational_workflows.md:1094`) `movement_type_code` is auto-derived
 * server-side from `material_categories.is_consumable` — '201' for
 * consumables, '311' for transfers — so it is intentionally NOT in the
 * schema.
 *
 * The `from_location_id IS DISTINCT FROM to_location_id` CHECK
 * (init_schema.sql:2783) is mirrored as a Zod refinement so the form
 * surfaces the violation as a field error instead of a 500.
 */
export const createRequisitionSchema = z
  .object({
    fromLocationId: z.guid({ error: "Select a source location" }),
    toLocationId: z.guid({ error: "Select a destination location" }),
    requesterRemark: z
      .string()
      .trim()
      .max(500, "Note too long")
      .nullable(),
    items: z
      .array(
        z.object({
          materialId: z.guid({ error: "Select a material" }),
          requestedQty: z
            .number({ error: "Required" })
            .positive("Must be > 0")
            .max(1_000_000, "Out of range"),
        }),
      )
      .min(1, "At least one line item is required")
      .max(
        MANAGER_REQUISITION_MAX_ITEMS,
        `Up to ${MANAGER_REQUISITION_MAX_ITEMS} line items per requisition`,
      ),
    idempotencyKey: z.string().uuid().optional(),
  })
  .refine((v) => v.fromLocationId !== v.toLocationId, {
    message: "Source and destination must differ",
    path: ["toLocationId"],
  });

export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;

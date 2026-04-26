import { z } from "zod";

import type { DisposalReason } from "@/features/inventory/types";

const DISPOSAL_REASONS = [
  "expired",
  "damaged",
  "contaminated",
  "preparation_error",
  "overproduction",
  "quality_defect",
] as const satisfies ReadonlyArray<DisposalReason>;

/**
 * Zod schema for the crew disposal (write-off) form.
 *
 * Business rule: if `explode_bom` is true, `bom_id` must be provided —
 * enforced via `.superRefine()` so the error surfaces at form level.
 */
export const submitDisposalSchema = z
  .object({
    material_id: z.string().min(1, "Material is required"),
    quantity: z
      .number({ message: "Quantity must be a number" })
      .positive("Quantity must be greater than zero"),
    location_id: z.string().min(1, "Location is required"),
    reason: z.enum(DISPOSAL_REASONS, {
      error: "A valid disposal reason is required",
    }),
    notes: z.string().optional(),
    photo_proof_url: z
      .string()
      .url("Photo proof must be a valid URL")
      .optional(),
    explode_bom: z.boolean(),
    bom_id: z.string().min(1).nullable(),
    /** Optional cost center for departmental waste attribution (WF-12). */
    cost_center_id: z.string().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.explode_bom && data.bom_id === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A BOM must be selected when explode BOM is enabled",
        path: ["bom_id"],
      });
    }
  });

export type SubmitDisposalInput = z.infer<typeof submitDisposalSchema>;

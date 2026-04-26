import { z } from "zod";

/**
 * Zod schema for marking a single write_off as reviewed.
 *
 * Spec: frontend_spec.md:2206 — "Server Action → UPDATE write_offs SET
 * reviewed_by = auth.uid(), reviewed_at = NOW()".
 */
export const markWriteOffReviewedSchema = z.object({
  writeOffId: z.guid(),
});

export type MarkWriteOffReviewedInput = z.infer<
  typeof markWriteOffReviewedSchema
>;

import { z } from "zod";

/**
 * Zod schema for approving a reconciliation. discrepancy_found is
 * computed server-side from the items so the client cannot lie about it.
 */
export const approveReconciliationSchema = z.object({
  reconciliationId: z.guid(),
});

export type ApproveReconciliationInput = z.infer<
  typeof approveReconciliationSchema
>;

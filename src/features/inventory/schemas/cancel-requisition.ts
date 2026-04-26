import { z } from "zod";

/**
 * Zod schema for cancel-requisition. Manager-side write — flips status to
 * 'cancelled' on a requisition that is still pending or in_progress.
 */
export const cancelRequisitionSchema = z.object({
  requisitionId: z.guid(),
});

export type CancelRequisitionInput = z.infer<typeof cancelRequisitionSchema>;

import { z } from "zod";

/**
 * Zod schema for reassign-requisition. Manager picks a new runner from
 * the active-staff list. Pass `null` to clear the assignee (unassign).
 */
export const reassignRequisitionSchema = z.object({
  requisitionId: z.guid(),
  newAssigneeId: z.guid().nullable(),
});

export type ReassignRequisitionInput = z.infer<
  typeof reassignRequisitionSchema
>;

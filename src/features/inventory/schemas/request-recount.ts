import { z } from "zod";

/**
 * Zod schema for the request-recount action. Wraps the
 * `rpc_request_recount(p_reconciliation_id, p_new_runner_id)` RPC at
 * `init_schema.sql:6128-6142`.
 *
 * `newAssigneeId === null` → keep current assignee (RPC's COALESCE).
 */
export const requestRecountSchema = z.object({
  reconciliationId: z.guid(),
  newAssigneeId: z.guid().nullable(),
});

export type RequestRecountInput = z.infer<typeof requestRecountSchema>;

import { z } from "zod";

/**
 * Zod schema for issuing a returnable asset. The server cross-checks
 * `materials.is_returnable = TRUE` before INSERT — only returnable
 * materials enter the custody ledger per WF-20.
 */
export const issueEquipmentSchema = z.object({
  materialId: z.guid({ error: "Pick a returnable material" }),
  assignedToId: z.guid({ error: "Pick a recipient" }),
  notes: z.string().trim().max(500, "Note too long").nullable(),
});

export type IssueEquipmentInput = z.infer<typeof issueEquipmentSchema>;

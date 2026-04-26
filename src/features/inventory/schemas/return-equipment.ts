import { z } from "zod";

/**
 * Zod schema for returning an issued asset. `conditionOnReturn` is
 * required so the audit trail always carries a state observation;
 * managers can still note "Good" or similar — empty values reduce the
 * signal of the column.
 */
export const returnEquipmentSchema = z.object({
  assignmentId: z.guid(),
  conditionOnReturn: z
    .string()
    .trim()
    .min(1, "Describe the condition on return")
    .max(200, "Condition note too long"),
  notes: z.string().trim().max(500, "Note too long").nullable(),
});

export type ReturnEquipmentInput = z.infer<typeof returnEquipmentSchema>;

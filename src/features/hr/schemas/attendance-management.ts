import { z } from "zod";

/**
 * Schemas for HR attendance management actions — used by the ledger + queue
 * surfaces. These are management-only schemas (hr:u gated).
 *
 * NOTE: `z.guid()` is used instead of `z.string().uuid()` — Zod 4's strict
 * UUID matcher rejects seed IDs with non-standard version/variant nibbles.
 * Postgres UUID is the authoritative check.
 */

const HR_NOTE_MAX_LEN = 500;

export const justifyExceptionSchema = z.object({
  exceptionId: z.guid(),
  reason: z
    .string()
    .min(3, "Justification reason must be at least 3 characters.")
    .max(HR_NOTE_MAX_LEN, `Reason must be at most ${HR_NOTE_MAX_LEN} characters.`),
});

export type JustifyExceptionInput = z.infer<typeof justifyExceptionSchema>;

export const rejectClarificationSchema = z.object({
  exceptionId: z.guid(),
  reason: z
    .string()
    .min(3, "Rejection reason must be at least 3 characters.")
    .max(HR_NOTE_MAX_LEN, `Reason must be at most ${HR_NOTE_MAX_LEN} characters.`),
});

export type RejectClarificationInput = z.infer<typeof rejectClarificationSchema>;

export const convertExceptionToLeaveSchema = z.object({
  exceptionId: z.guid(),
  leaveTypeId: z.guid(),
  days: z.number().gt(0, "Days must be greater than 0.").lte(30, "Days cannot exceed 30."),
  note: z.string().max(HR_NOTE_MAX_LEN).default(""),
});

export type ConvertExceptionToLeaveInput = z.infer<typeof convertExceptionToLeaveSchema>;

export const voidPunchSchema = z.object({
  punchId: z.guid(),
});

export type VoidPunchInput = z.infer<typeof voidPunchSchema>;

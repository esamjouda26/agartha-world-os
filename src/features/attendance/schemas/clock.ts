import { z } from "zod";

import { CLARIFICATION_MAX_LEN } from "@/features/attendance/constants";

/**
 * Attendance mutation schemas — one Zod schema per Server Action, consumed on
 * both client (RHF resolver) and server (pipeline step 1). No duplication.
 */

const gpsSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy: z.number().nonnegative().finite(),
});

export const clockMutationSchema = z.object({
  gps: gpsSchema.nullable(),
  selfieUrl: z.string().min(1, "Selfie is required to clock in."),
  remark: z.string().max(240).nullable(),
});

export type ClockMutationInput = z.infer<typeof clockMutationSchema>;

/**
 * Attachment path: produced by `uploadClarificationAttachment` — has the
 * shape `{staff_record_id}/{exception_id}/{uuid}.{ext}` relative to the
 * `attendance-clarifications` bucket. Storage RLS locks the first segment
 * to the caller's staff_record_id; the RPC double-checks.
 *
 * Cap of 5 matches the typical MC + cab-receipt + whatever the user snaps —
 * past that the form is more appeal than explanation.
 */
export const submitClarificationSchema = z.object({
  exceptionId: z.string().uuid(),
  text: z
    .string()
    .min(3, "Clarification must be at least 3 characters.")
    .max(
      CLARIFICATION_MAX_LEN,
      `Clarification must be at most ${CLARIFICATION_MAX_LEN} characters.`,
    ),
  attachmentPaths: z.array(z.string().min(1)).max(5, "At most 5 attachments.").default([]),
});

export type SubmitClarificationInput = z.infer<typeof submitClarificationSchema>;

export const rejectClarificationSchema = z.object({
  exceptionId: z.string().uuid(),
  reason: z
    .string()
    .min(3, "Rejection reason must be at least 3 characters.")
    .max(CLARIFICATION_MAX_LEN, `Reason must be at most ${CLARIFICATION_MAX_LEN} characters.`),
});

export type RejectClarificationInput = z.infer<typeof rejectClarificationSchema>;

export const justifyExceptionSchema = z.object({
  exceptionId: z.string().uuid(),
  reason: z
    .string()
    .min(3, "Justification reason must be at least 3 characters.")
    .max(CLARIFICATION_MAX_LEN, `Reason must be at most ${CLARIFICATION_MAX_LEN} characters.`),
});

export type JustifyExceptionInput = z.infer<typeof justifyExceptionSchema>;

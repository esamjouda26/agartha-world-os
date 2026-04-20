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

export const addClarificationSchema = z.object({
  exceptionId: z.string().uuid(),
  text: z
    .string()
    .min(3, "Clarification must be at least 3 characters.")
    .max(
      CLARIFICATION_MAX_LEN,
      `Clarification must be at most ${CLARIFICATION_MAX_LEN} characters.`,
    ),
});

export type AddClarificationInput = z.infer<typeof addClarificationSchema>;

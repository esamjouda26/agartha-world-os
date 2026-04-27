import { z } from "zod";

import { BOOKING_REF_REGEX } from "@/features/booking/schemas/booking-lookup";

/**
 * Schema for the public /survey form.
 *
 * Aligns with `survey_responses` (init_schema.sql:3899-3917) + the anon
 * RLS policy (advisor_warnings_round2.sql:55-67):
 *   - staff_submitted MUST be FALSE; submitted_by MUST be NULL — both are
 *     enforced by RLS, so the action passes them as constants and never
 *     accepts them from the client.
 *   - sentiment is derived from overall_score server-side (not a user
 *     input) per frontend_spec.md:3744.
 *
 * Required: overall_score. Everything else is optional — keeps the
 * minimum bar low for completion rate.
 */

export const SURVEY_KEYWORDS = [
  "staff_friendliness",
  "cleanliness",
  "wait_times",
  "value_for_money",
  "food_quality",
  "atmosphere",
] as const;
export type SurveyKeyword = (typeof SURVEY_KEYWORDS)[number];

export const SURVEY_KEYWORD_LABELS: Record<SurveyKeyword, string> = {
  staff_friendliness: "Staff friendliness",
  cleanliness: "Cleanliness",
  wait_times: "Wait times",
  value_for_money: "Value for money",
  food_quality: "Food quality",
  atmosphere: "Atmosphere",
};

const score = z.number().int().min(0).max(10);

export const submitSurveySchema = z.object({
  overall_score: score,
  nps_score: score.nullable(),
  keywords: z.array(z.enum(SURVEY_KEYWORDS)).max(SURVEY_KEYWORDS.length),
  feedback_text: z.string().trim().max(2000, "Tell us more in 2000 characters or fewer").nullable(),
  /** Optional booking_ref hint from the URL — service-role lookup resolves to booking_id. */
  booking_ref: z.string().trim().toUpperCase().regex(BOOKING_REF_REGEX).nullable(),
  /** Survey source — driven by `?source=` URL param, defaults to in_app. */
  source: z.enum(["in_app", "email", "kiosk", "qr_code"]),
});
export type SubmitSurveyInput = z.infer<typeof submitSurveySchema>;

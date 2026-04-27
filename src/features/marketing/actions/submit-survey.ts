"use server";

import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";

import { verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

import {
  submitSurveySchema,
  type SubmitSurveyInput,
} from "@/features/marketing/schemas/submit-survey";

/**
 * Submit a guest post-visit survey.
 *
 * Spec: frontend_spec.md:3725-3766. Anon RLS policy
 * `survey_responses_insert_anon` (advisor_warnings_round2.sql:57-64) gates
 * the INSERT to `staff_submitted=FALSE AND submitted_by IS NULL`; the
 * action mirrors that constraint as a constant — never passes user-
 * controlled values for those columns.
 *
 * sentiment is derived server-side from overall_score per spec line 3744:
 *   0-6 = negative, 7 = neutral, 8-10 = positive.
 *
 * If the optional booking_ref URL hint is provided, we resolve it to
 * booking_id via service-role (bookings has no anon SELECT). Failed
 * lookups are silent — the survey still records, with booking_id NULL.
 */

const limiter = createRateLimiter({
  // Public anonymous endpoint — tight per-IP limit prevents flood-spam
  // skewing the NPS metric.
  tokens: 5,
  window: "1 h",
  prefix: "guest-survey",
});

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown"
  );
}

function deriveSentiment(score: number): "negative" | "neutral" | "positive" {
  if (score <= 6) return "negative";
  if (score === 7) return "neutral";
  return "positive";
}

export async function submitSurveyAction(
  input: SubmitSurveyInput,
): Promise<ServerActionResult<{ id: string }>> {
  // 1. Validate.
  const parsed = submitSurveySchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // 1b. CSRF — same-origin check.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  // 2. Auth — anonymous; no auth check.
  // 3. IP rate-limit.
  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Idempotency — N/A. Survey responses are append-only and the user
  // gets a confirmation panel on success that prevents accidental
  // re-submit; on rare double-clicks we accept duplicate rows rather
  // than burning DB capacity on a dedupe table.

  // 5. Optional booking_ref → booking_id resolution (service-role).
  let booking_id: string | null = null;
  if (parsed.data.booking_ref) {
    const service = createSupabaseServiceClient();
    const { data } = await service
      .from("bookings")
      .select("id")
      .eq("booking_ref", parsed.data.booking_ref)
      .maybeSingle();
    booking_id = data?.id ?? null;
  }

  // 6. INSERT via anon-key client so the strict RLS policy is the gate.
  const supabase = await createSupabaseServerClient();
  const sentiment = deriveSentiment(parsed.data.overall_score);

  const { data: inserted, error: insertError } = await supabase
    .from("survey_responses")
    .insert({
      survey_type: "post_visit",
      overall_score: parsed.data.overall_score,
      nps_score: parsed.data.nps_score,
      sentiment,
      keywords: parsed.data.keywords,
      feedback_text:
        parsed.data.feedback_text && parsed.data.feedback_text.length > 0
          ? parsed.data.feedback_text
          : null,
      source: parsed.data.source,
      staff_submitted: false,
      submitted_by: null,
      booking_id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    after(async () => {
      loggerWith({ feature: "marketing", event: "survey.submit_error" }).error(
        { msg: insertError?.message ?? "no row", source: parsed.data.source },
        "submitSurveyAction failed",
      );
    });
    return fail("INTERNAL");
  }

  // 7. No cache invalidation — guest writes don't drive any cached read here.
  // 8. Telemetry — log scores and sentiment but never feedback_text (PII).
  after(async () => {
    loggerWith({ feature: "marketing", event: "survey.submitted" }).info(
      {
        id: inserted.id,
        overall_score: parsed.data.overall_score,
        nps_score: parsed.data.nps_score,
        sentiment,
        source: parsed.data.source,
        has_text: parsed.data.feedback_text ? parsed.data.feedback_text.length > 0 : false,
        keyword_count: parsed.data.keywords.length,
        linked_booking: booking_id !== null,
      },
      "submitSurveyAction",
    );
  });

  return ok({ id: inserted.id });
}

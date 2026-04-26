"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MARKETING_ROUTER_PATHS } from "@/features/marketing/cache-tags";

const schema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  feedbackText: z.string().min(10, "Please enter at least 10 characters"),
  keywords: z.array(z.string()).default([]),
  overallScore: z.number().min(1).max(10).nullable().optional(),
  bookingRef: z.string().optional(),
});

const limiter = createRateLimiter({ tokens: 20, window: "60 s", prefix: "feedback-submit" });

/**
 * Submit staff-captured guest feedback.
 * Tier 2 universal INSERT: RLS enforces staff_submitted = TRUE AND submitted_by = auth.uid().
 * init_schema.sql:3899 — survey_responses.
 */
export async function submitFeedbackAction(
  input: unknown,
): Promise<ServerActionResult<{ feedbackId: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Optional: resolve booking_id from booking_ref
  let bookingId: string | null = null;
  if (parsed.data.bookingRef?.trim()) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_ref", parsed.data.bookingRef.trim())
      .maybeSingle();
    bookingId = booking?.id ?? null;
  }

  const { data, error } = await supabase
    .from("survey_responses")
    .insert({
      survey_type: "staff_captured",
      sentiment: parsed.data.sentiment,
      feedback_text: parsed.data.feedbackText,
      keywords: parsed.data.keywords,
      overall_score: parsed.data.overallScore ?? null,
      booking_id: bookingId,
      source: "in_app",
      staff_submitted: true,
      submitted_by: user.id,
    })
    .select("id")
    .single();

  if (error) return fail("INTERNAL");

  for (const path of MARKETING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "marketing", event: "submit_feedback", user_id: user.id }).info(
      { feedbackId: data.id },
      "submitFeedbackAction completed",
    );
  });

  return ok({ feedbackId: data.id });
}

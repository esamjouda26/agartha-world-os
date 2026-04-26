import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { RecentFeedbackRow } from "@/features/marketing/types";

/**
 * Fetch own 10 most recent staff-submitted survey responses.
 * init_schema.sql:3899 — survey_responses.
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getRecentFeedback = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
  ): Promise<ReadonlyArray<RecentFeedbackRow>> => {
    const { data, error } = await client
      .from("survey_responses")
      .select("id, sentiment, feedback_text, overall_score, created_at")
      .eq("submitted_by", userId)
      .eq("staff_submitted", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data ?? []).map((r): RecentFeedbackRow => ({
      id: r.id,
      sentiment: r.sentiment,
      feedbackText: r.feedback_text,
      overallScore: r.overall_score,
      createdAt: r.created_at,
    }));
  },
);

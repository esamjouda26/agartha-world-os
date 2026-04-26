import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { GuestSurveyRow, StaffFeedbackRow, SurveysData } from "@/features/marketing/types";

type RangeBounds = Readonly<{ from: string | null; to: string | null }>;

/**
 * Fetch /management/marketing/surveys data per frontend_spec.md:2600-2646.
 *
 * Both tabs read `survey_responses` (init_schema.sql:3899). Guest tab
 * filters `staff_submitted = false AND survey_type != 'staff_captured'`;
 * staff tab filters `staff_submitted = true AND survey_type =
 * 'staff_captured'`. RLS Tier-3 — `marketing:r` OR `reports:r`
 * (init_schema.sql:3966-3969).
 *
 * `submitted_by` references `auth.users(id)`, not `profiles(id)` —
 * PostgREST cannot auto-join across the auth schema, so we fetch
 * profile display_names separately and merge in JS (per AgarthaOS
 * Phase 7 addendum on "PostgREST cannot auto-join composite FKs").
 *
 * Bookings join goes through `survey_responses.booking_id` which IS a
 * standard FK so PostgREST can nest that. `experiences` nests off
 * bookings via `bookings.experience_id`.
 *
 * Range bounds are inclusive of the entire UTC day for `to` so that
 * `2026-04-27` covers the day's full window.
 */
export const getSurveysData = cache(
  async (client: SupabaseClient<Database>, range: RangeBounds): Promise<SurveysData> => {
    const fromIso = range.from ? `${range.from}T00:00:00.000Z` : null;
    const toIso = range.to ? `${range.to}T23:59:59.999Z` : null;

    let guestQuery = client
      .from("survey_responses")
      .select(
        "id, survey_type, source, sentiment, overall_score, nps_score, keywords, feedback_text, booking_id, created_at, booking:bookings(booking_ref, experience:experiences(name))",
      )
      .eq("staff_submitted", false)
      .neq("survey_type", "staff_captured")
      .order("created_at", { ascending: false })
      .limit(2000);

    let staffQuery = client
      .from("survey_responses")
      .select(
        "id, submitted_by, sentiment, feedback_text, keywords, overall_score, booking_id, created_at, booking:bookings(booking_ref)",
      )
      .eq("staff_submitted", true)
      .eq("survey_type", "staff_captured")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (fromIso) {
      guestQuery = guestQuery.gte("created_at", fromIso);
      staffQuery = staffQuery.gte("created_at", fromIso);
    }
    if (toIso) {
      guestQuery = guestQuery.lte("created_at", toIso);
      staffQuery = staffQuery.lte("created_at", toIso);
    }

    // "This month" KPI on the staff tab (frontend_spec.md:2616) is a
    // fixed at-a-glance reference — it must NOT collapse to 0 when the
    // user picks a date range outside the current calendar month. So
    // we count it server-side, scoped to the current month boundary,
    // and parallel-fetch alongside the range-filtered queries.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();
    const monthCountQuery = client
      .from("survey_responses")
      .select("id", { count: "exact", head: true })
      .eq("staff_submitted", true)
      .eq("survey_type", "staff_captured")
      .gte("created_at", monthStartIso);

    const [guestRes, staffRes, monthCountRes] = await Promise.all([
      guestQuery,
      staffQuery,
      monthCountQuery,
    ]);
    if (guestRes.error) throw guestRes.error;
    if (staffRes.error) throw staffRes.error;
    if (monthCountRes.error) throw monthCountRes.error;

    // ── Resolve submitter display_name via separate profiles fetch ──
    const submitterIds = Array.from(
      new Set(
        (staffRes.data ?? []).map((r) => r.submitted_by).filter((id): id is string => id !== null),
      ),
    );
    const nameById = new Map<string, string>();
    if (submitterIds.length > 0) {
      const { data: profileRows, error: profileErr } = await client
        .from("profiles")
        .select("id, display_name")
        .in("id", submitterIds);
      if (profileErr) throw profileErr;
      for (const p of profileRows ?? []) {
        if (p.display_name) nameById.set(p.id, p.display_name);
      }
    }

    const toKeywords = (raw: unknown): string[] => {
      if (!Array.isArray(raw)) return [];
      const out: string[] = [];
      for (const k of raw) {
        if (typeof k === "string" && k.trim().length > 0) out.push(k);
      }
      return out;
    };

    const guestRows: GuestSurveyRow[] = (guestRes.data ?? []).map((r) => ({
      id: r.id,
      surveyType: r.survey_type,
      source: r.source,
      sentiment: r.sentiment,
      overallScore: r.overall_score,
      npsScore: r.nps_score,
      keywords: toKeywords(r.keywords),
      feedbackText: r.feedback_text,
      bookingRef: r.booking?.booking_ref ?? null,
      experienceName: r.booking?.experience?.name ?? null,
      createdAt: r.created_at,
    }));

    const staffRows: StaffFeedbackRow[] = (staffRes.data ?? []).map((r) => ({
      id: r.id,
      submittedById: r.submitted_by,
      submittedByName: r.submitted_by ? (nameById.get(r.submitted_by) ?? null) : null,
      sentiment: r.sentiment,
      feedbackText: r.feedback_text,
      keywords: toKeywords(r.keywords),
      overallScore: r.overall_score,
      bookingRef: r.booking?.booking_ref ?? null,
      createdAt: r.created_at,
    }));

    return {
      guestRows,
      staffRows,
      range,
      staffThisMonthCount: monthCountRes.count ?? 0,
    };
  },
);

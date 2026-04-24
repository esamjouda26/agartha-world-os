import "server-only";

import { cache } from "react";
import { addDays, addMonths } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type NpsBreakdown = Readonly<{
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  npsScore: number | null;
}>;

export type ScoreBucket = Readonly<{ score: number; count: number }>;

export type DailySentiment = Readonly<{ date: string; avgScore: number; count: number }>;

export type KeywordItem = Readonly<{ keyword: string; count: number }>;

export type ChannelCount = Readonly<{ source: string; count: number }>;

export type ExperienceScore = Readonly<{
  experienceId: string;
  experienceName: string;
  avgScore: number;
  count: number;
}>;

export type GuestsDashboardData = Readonly<{
  periodFrom: string;
  periodTo: string;
  // KPIs
  npsScore: number | null;
  avgOverallRating: number | null;
  totalResponses: number;
  responsePct: number | null;
  completedBookings: number;
  // NPS breakdown
  npsBreakdown: NpsBreakdown;
  // Score distribution (0-10)
  scoreDistribution: ReadonlyArray<ScoreBucket>;
  // Daily sentiment trend
  sentimentTrend: ReadonlyArray<DailySentiment>;
  // Complaint themes (negative = score ≤ 6)
  complaintThemes: ReadonlyArray<KeywordItem>;
  // Channel breakdown
  channelBreakdown: ReadonlyArray<ChannelCount>;
  // By experience
  experienceScores: ReadonlyArray<ExperienceScore>;
}>;

export function resolvePeriodBounds(params: { range?: string | null }): {
  from: string;
  to: string;
} {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0]!;
  const to = fmt(today);
  switch (params.range) {
    case "90d":
      return { from: fmt(addMonths(today, -3)), to };
    case "30d":
    default:
      return { from: fmt(addDays(today, -29)), to };
  }
}

export const getGuestsDashboard = cache(
  async (
    client: SupabaseClient<Database>,
    bounds: { from: string; to: string },
  ): Promise<GuestsDashboardData> => {
    const fromTs = `${bounds.from}T00:00:00.000Z`;
    const toTs = `${bounds.to}T23:59:59.999Z`;

    const [surveysResult, bookingsResult] = await Promise.all([
      client
        .from("survey_responses")
        .select("id, overall_score, nps_score, sentiment, keywords, source, booking_id, created_at")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      client
        .from("bookings")
        .select("id, experience_id, status, experiences!bookings_experience_id_fkey ( id, name )")
        .in("status", ["checked_in", "completed"])
        .gte("created_at", fromTs)
        .lte("created_at", toTs),
    ]);

    if (surveysResult.error) throw surveysResult.error;
    if (bookingsResult.error) throw bookingsResult.error;

    const surveys = surveysResult.data ?? [];
    const bookings = bookingsResult.data ?? [];
    const completedBookings = bookings.length;
    const totalResponses = surveys.length;

    // ── NPS ──────────────────────────────────────────────────────────
    const npsResponses = surveys.filter((s) => s.nps_score != null);
    const promoters = npsResponses.filter((s) => (s.nps_score ?? 0) >= 9).length;
    const passives = npsResponses.filter(
      (s) => (s.nps_score ?? 0) >= 7 && (s.nps_score ?? 0) <= 8,
    ).length;
    const detractors = npsResponses.filter((s) => (s.nps_score ?? 0) <= 6).length;
    const npsTotal = npsResponses.length;
    const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : null;

    // ── Avg rating ────────────────────────────────────────────────────
    const ratedSurveys = surveys.filter((s) => s.overall_score != null);
    const avgOverallRating =
      ratedSurveys.length > 0
        ? ratedSurveys.reduce((s, r) => s + Number(r.overall_score), 0) / ratedSurveys.length
        : null;

    // ── Response rate ─────────────────────────────────────────────────
    const responsePct =
      completedBookings > 0 ? Math.round((totalResponses / completedBookings) * 100) : null;

    // ── Score distribution (0–10) ─────────────────────────────────────
    const bucketMap = new Map<number, number>();
    for (let i = 0; i <= 10; i++) bucketMap.set(i, 0);
    for (const s of ratedSurveys) {
      const score = Math.round(Number(s.overall_score));
      bucketMap.set(score, (bucketMap.get(score) ?? 0) + 1);
    }
    const scoreDistribution: ScoreBucket[] = Array.from(bucketMap.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => a.score - b.score);

    // ── Daily sentiment trend ─────────────────────────────────────────
    const dailyMap = new Map<string, { total: number; count: number }>();
    for (const s of ratedSurveys) {
      const date = s.created_at.split("T")[0]!;
      const ex = dailyMap.get(date) ?? { total: 0, count: 0 };
      ex.total += Number(s.overall_score);
      ex.count += 1;
      dailyMap.set(date, ex);
    }
    const sentimentTrend: DailySentiment[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({
        date,
        avgScore: Math.round((v.total / v.count) * 10) / 10,
        count: v.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Complaint themes (negative: score ≤ 6) ────────────────────────
    const negativeSurveys = surveys.filter(
      (s) => s.overall_score != null && Number(s.overall_score) <= 6,
    );
    const kwMap = new Map<string, number>();
    for (const s of negativeSurveys) {
      const kws = Array.isArray(s.keywords) ? (s.keywords as string[]) : [];
      for (const kw of kws) {
        if (typeof kw === "string" && kw.trim()) {
          kwMap.set(kw.toLowerCase(), (kwMap.get(kw.toLowerCase()) ?? 0) + 1);
        }
      }
    }
    const complaintThemes: KeywordItem[] = Array.from(kwMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ── Channel breakdown ─────────────────────────────────────────────
    const sourceMap = new Map<string, number>();
    for (const s of surveys) {
      const src = s.source ?? "unknown";
      sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
    }
    const channelBreakdown: ChannelCount[] = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // ── By experience ─────────────────────────────────────────────────
    const surveyBookingMap = new Map<string, string>(); // bookingId → experienceId
    const expNameMap = new Map<string, string>();
    for (const b of bookings) {
      surveyBookingMap.set(b.id, b.experience_id);
      const exp = b.experiences as { id: string; name: string } | null;
      if (exp) expNameMap.set(exp.id, exp.name);
    }

    const expScoreMap = new Map<string, { total: number; count: number }>();
    for (const s of ratedSurveys) {
      if (!s.booking_id) continue;
      const expId = surveyBookingMap.get(s.booking_id);
      if (!expId) continue;
      const ex = expScoreMap.get(expId) ?? { total: 0, count: 0 };
      ex.total += Number(s.overall_score);
      ex.count += 1;
      expScoreMap.set(expId, ex);
    }
    const experienceScores: ExperienceScore[] = Array.from(expScoreMap.entries())
      .map(([id, v]) => ({
        experienceId: id,
        experienceName: expNameMap.get(id) ?? "Unknown",
        avgScore: Math.round((v.total / v.count) * 10) / 10,
        count: v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return {
      periodFrom: bounds.from,
      periodTo: bounds.to,
      npsScore,
      avgOverallRating,
      totalResponses,
      responsePct,
      completedBookings,
      npsBreakdown: { promoters, passives, detractors, total: npsTotal, npsScore },
      scoreDistribution,
      sentimentTrend,
      complaintThemes,
      channelBreakdown,
      experienceScores,
    };
  },
);

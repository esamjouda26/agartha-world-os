import "server-only";

import { cache } from "react";

import { startOfWeek, differenceInDays, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { BusinessDashboardData, RevenuePoint } from "@/features/business/types/business";

type DateBounds = Readonly<{
  from: string; // ISO date YYYY-MM-DD
  to: string;
  compareFrom?: string;
  compareTo?: string;
}>;

/**
 * RSC query — Executive Dashboard aggregates.
 * All queries run in parallel. No N+1.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getBusinessDashboard = cache(
  async (client: SupabaseClient<Database>, bounds: DateBounds): Promise<BusinessDashboardData> => {
    const { from, to, compareFrom, compareTo } = bounds;
    const hasComparison = Boolean(compareFrom && compareTo);

    // ISO timestamps for range filters (inclusive start, inclusive end)
    const fromTs = `${from}T00:00:00.000Z`;
    const toTs = `${to}T23:59:59.999Z`;
    const cFromTs = compareFrom ? `${compareFrom}T00:00:00.000Z` : null;
    const cToTs = compareTo ? `${compareTo}T23:59:59.999Z` : null;

    const todayIso = new Date().toISOString().split("T")[0]!;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split("T")[0]!;

    // ── Parallel queries ───────────────────────────────────────────────
    const [
      posRevenueResult,
      bookingRevenueResult,
      priorPosResult,
      priorBookingResult,
      posDetailResult,
      bookingDetailResult,
      latestTelemetryResult,
      zonesResult,
      incidentsResult,
      maintenanceResult,
      surveyResult,
      attendanceTodayResult,
      exceptionsResult,
    ] = await Promise.all([
      // 1. POS revenue current period
      client
        .from("orders")
        .select("total_amount, created_at")
        .eq("status", "completed")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      // 2. Booking revenue current period
      client
        .from("booking_payments")
        .select("amount, paid_at, created_at")
        .eq("status", "success")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      // 3. POS revenue comparison period
      hasComparison && cFromTs && cToTs
        ? client
            .from("orders")
            .select("total_amount")
            .eq("status", "completed")
            .gte("created_at", cFromTs)
            .lte("created_at", cToTs)
        : Promise.resolve({ data: null, error: null }),

      // 4. Booking revenue comparison period
      hasComparison && cFromTs && cToTs
        ? client
            .from("booking_payments")
            .select("amount")
            .eq("status", "success")
            .gte("created_at", cFromTs)
            .lte("created_at", cToTs)
        : Promise.resolve({ data: null, error: null }),

      // 5. POS daily detail for sparkline (limit 60 days)
      client
        .from("orders")
        .select("total_amount, created_at")
        .eq("status", "completed")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: true }),

      // 6. Booking daily detail for sparkline
      client
        .from("booking_payments")
        .select("amount, created_at")
        .eq("status", "success")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: true }),

      // 7. Latest telemetry per zone
      client
        .from("zone_telemetry")
        .select("zone_id, current_occupancy, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(500),

      // 8. Zones with capacity
      client.from("zones").select("id, capacity").eq("is_active", true),

      // 9. Open incidents
      client.from("incidents").select("id", { count: "exact", head: true }).eq("status", "open"),

      // 10. Active maintenance WOs
      client
        .from("maintenance_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      // 11. Survey responses for period
      client
        .from("survey_responses")
        .select("overall_score, nps_score")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      // 12. Attendance today from v_shift_attendance
      client.from("v_shift_attendance").select("derived_status").eq("shift_date", todayIso),

      // 13. Unjustified exceptions this week
      client
        .from("attendance_exceptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "unjustified")
        .gte("created_at", `${weekStart}T00:00:00.000Z`),
    ]);

    // Error guards — throw on any query failure
    if (posRevenueResult.error) throw posRevenueResult.error;
    if (bookingRevenueResult.error) throw bookingRevenueResult.error;
    if (latestTelemetryResult.error) throw latestTelemetryResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (maintenanceResult.error) throw maintenanceResult.error;
    if (surveyResult.error) throw surveyResult.error;
    if (attendanceTodayResult.error) throw attendanceTodayResult.error;
    if (exceptionsResult.error) throw exceptionsResult.error;

    // ── Revenue aggregates ────────────────────────────────────────────
    const posRevenue = (posRevenueResult.data ?? []).reduce(
      (s, r) => s + Number(r.total_amount),
      0,
    );
    const bookingRevenue = (bookingRevenueResult.data ?? []).reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const priorPosRevenue = priorPosResult.data
      ? priorPosResult.data.reduce((s, r) => s + Number(r.total_amount), 0)
      : null;
    const priorBookingRevenue = priorBookingResult.data
      ? priorBookingResult.data.reduce((s, r) => s + Number(r.amount), 0)
      : null;

    // ── Revenue trend: daily buckets ──────────────────────────────────
    const dailyMap = new Map<string, { pos: number; booking: number }>();

    for (const r of posDetailResult.data ?? []) {
      const date = r.created_at.split("T")[0]!;
      const existing = dailyMap.get(date) ?? { pos: 0, booking: 0 };
      existing.pos += Number(r.total_amount);
      dailyMap.set(date, existing);
    }
    for (const r of bookingDetailResult.data ?? []) {
      const date = r.created_at.split("T")[0]!;
      const existing = dailyMap.get(date) ?? { pos: 0, booking: 0 };
      existing.booking += Number(r.amount);
      dailyMap.set(date, existing);
    }

    const revenueTrend: RevenuePoint[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, posRevenue: v.pos, bookingRevenue: v.booking }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Occupancy ─────────────────────────────────────────────────────
    const latestZoneTelemetry = new Map<string, number>();
    for (const t of latestTelemetryResult.data ?? []) {
      if (!latestZoneTelemetry.has(t.zone_id)) {
        latestZoneTelemetry.set(t.zone_id, t.current_occupancy ?? 0);
      }
    }
    let currentOccupancy = 0;
    let totalCapacity = 0;
    for (const z of zonesResult.data ?? []) {
      currentOccupancy += latestZoneTelemetry.get(z.id) ?? 0;
      totalCapacity += z.capacity;
    }

    // ── Guest satisfaction ────────────────────────────────────────────
    const surveys = surveyResult.data ?? [];
    const surveyCount = surveys.length;
    let avgVisitRating: number | null = null;
    let npsScore: number | null = null;

    if (surveyCount > 0) {
      const ratedSurveys = surveys.filter((s) => s.overall_score != null);
      if (ratedSurveys.length > 0) {
        avgVisitRating =
          ratedSurveys.reduce((s, r) => s + Number(r.overall_score), 0) / ratedSurveys.length;
      }

      const npsSurveys = surveys.filter((s) => s.nps_score != null);
      if (npsSurveys.length > 0) {
        const promoters = npsSurveys.filter((s) => (s.nps_score ?? 0) >= 9).length;
        const detractors = npsSurveys.filter((s) => (s.nps_score ?? 0) <= 6).length;
        npsScore = Math.round(((promoters - detractors) / npsSurveys.length) * 100);
      }
    }

    // ── Workforce ─────────────────────────────────────────────────────
    const shifts = attendanceTodayResult.data ?? [];
    const scheduledToday = shifts.length;
    const presentToday = shifts.filter((s) =>
      ["completed", "in_progress", "on_leave"].includes(s.derived_status ?? ""),
    ).length;

    return {
      periodFrom: from,
      periodTo: to,
      hasComparison,
      posRevenue,
      bookingRevenue,
      totalRevenue: posRevenue + bookingRevenue,
      priorPosRevenue,
      priorBookingRevenue,
      priorTotalRevenue:
        priorPosRevenue != null && priorBookingRevenue != null
          ? priorPosRevenue + priorBookingRevenue
          : null,
      revenueTrend,
      currentOccupancy,
      totalCapacity,
      openIncidents: incidentsResult.count ?? 0,
      activeMaintenanceWOs: maintenanceResult.count ?? 0,
      npsScore,
      avgVisitRating,
      surveyCount,
      scheduledToday,
      presentToday,
      unjustifiedExceptionsThisWeek: exceptionsResult.count ?? 0,
    };
  },
);

// ── Period resolver ────────────────────────────────────────────────────

export type PeriodPreset = "today" | "7d" | "30d";

/**
 * Resolve URL search params to concrete date bounds.
 * Called in the RSC page — parses `?range`, `?from`, `?to`, `?compare`.
 */
export function resolvePeriodBounds(params: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
  compare?: string | null;
}): DateBounds {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0]!;

  let from: string;
  let to: string = fmt(today);

  switch (params.range) {
    case "7d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      from = fmt(d);
      break;
    }
    case "30d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      from = fmt(d);
      break;
    }
    case "today":
    default: {
      from = fmt(today);
      break;
    }
  }

  // Custom range overrides preset
  if (params.from && params.to) {
    from = params.from;
    to = params.to;
  }

  // Comparison: shift the range back by the same number of days (using date-fns)
  let compareFrom: string | undefined;
  let compareTo: string | undefined;
  if (params.compare === "1") {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    // +1 to make range inclusive on both ends
    const durationDays = differenceInDays(toDate, fromDate) + 1;
    const cTo = subDays(fromDate, 1);
    const cFrom = subDays(cTo, durationDays - 1);
    compareFrom = fmt(cFrom);
    compareTo = fmt(cTo);
  }

  return {
    from,
    to,
    ...(compareFrom != null ? { compareFrom } : {}),
    ...(compareTo != null ? { compareTo } : {}),
  };
}

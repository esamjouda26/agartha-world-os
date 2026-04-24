import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  RevenueDashboardData,
  BarItem,
  PaymentMethodBreakdown,
  DailyRevenue,
  SlotUtilDay,
} from "@/features/business/types/revenue";
import { resolvePeriodBounds } from "@/features/business/queries/get-business-dashboard";

export { resolvePeriodBounds };

/**
 * RSC query — Revenue deep-dive page.
 * Parallel fetches — no N+1 per row.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getRevenueDashboard = cache(
  async (
    client: SupabaseClient<Database>,
    bounds: { from: string; to: string },
  ): Promise<RevenueDashboardData> => {
    const fromTs = `${bounds.from}T00:00:00.000Z`;
    const toTs = `${bounds.to}T23:59:59.999Z`;

    const [ordersResult, orderItemsResult, bookingsResult, bookingPaymentsResult, timeSlotsResult] =
      await Promise.all([
        // 1. Orders + pos_point name + payment_method
        client
          .from("orders")
          .select(
            "id, total_amount, payment_method, created_at, pos_points!orders_pos_point_id_fkey ( display_name )",
          )
          .eq("status", "completed")
          .gte("created_at", fromTs)
          .lte("created_at", toTs),

        // 2. Order items + material name
        client
          .from("order_items")
          .select(
            "material_id, quantity, unit_price, materials!order_items_material_id_fkey ( name ), orders!order_items_order_id_fkey ( created_at, status )",
          )
          .order("created_at", { ascending: false }),

        // 3. Bookings + tier name + experience name
        client
          .from("bookings")
          .select(
            "id, total_price, created_at, tiers!bookings_tier_id_fkey ( id, name ), experiences!bookings_experience_id_fkey ( id, name )",
          )
          .in("status", ["confirmed", "checked_in", "completed"])
          .gte("created_at", fromTs)
          .lte("created_at", toTs),

        // 4. Booking payments for method distribution
        client
          .from("booking_payments")
          .select("amount, method")
          .eq("status", "success")
          .gte("created_at", fromTs)
          .lte("created_at", toTs),

        // 5. Time slots for utilization
        client
          .from("time_slots")
          .select(
            "slot_date, booked_count, override_capacity, experiences!time_slots_experience_id_fkey ( capacity_per_slot )",
          )
          .gte("slot_date", bounds.from)
          .lte("slot_date", bounds.to)
          .order("slot_date", { ascending: true }),
      ]);

    if (ordersResult.error) throw ordersResult.error;
    if (orderItemsResult.error) throw orderItemsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (bookingPaymentsResult.error) throw bookingPaymentsResult.error;
    if (timeSlotsResult.error) throw timeSlotsResult.error;

    const orders = ordersResult.data ?? [];
    const orderItems = orderItemsResult.data ?? [];
    const bookings = bookingsResult.data ?? [];
    const bookingPayments = bookingPaymentsResult.data ?? [];
    const timeSlots = timeSlotsResult.data ?? [];

    // ── POS KPIs ──────────────────────────────────────────────────────
    const posRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const orderCount = orders.length;
    const avgPosTicket = orderCount > 0 ? posRevenue / orderCount : null;

    // ── Booking KPIs ──────────────────────────────────────────────────
    const bookingRevenue = bookings.reduce((s, b) => s + Number(b.total_price), 0);
    const bookingCount = bookings.length;
    const avgBookingValue = bookingCount > 0 ? bookingRevenue / bookingCount : null;

    // ── POS revenue by point ──────────────────────────────────────────
    const posPointMap = new Map<string, { revenue: number; count: number }>();
    for (const o of orders) {
      const pp = o.pos_points as { display_name: string } | null;
      const key = pp?.display_name ?? "Unknown";
      const existing = posPointMap.get(key) ?? { revenue: 0, count: 0 };
      existing.revenue += Number(o.total_amount);
      existing.count += 1;
      posPointMap.set(key, existing);
    }
    const posRevenueByPoint: BarItem[] = Array.from(posPointMap.entries())
      .map(([label, v], i) => ({ id: String(i), label, revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── POS payment mix ───────────────────────────────────────────────
    const posPaymentMap = new Map<string, { revenue: number; count: number }>();
    for (const o of orders) {
      const m = o.payment_method ?? "unknown";
      const existing = posPaymentMap.get(m) ?? { revenue: 0, count: 0 };
      existing.revenue += Number(o.total_amount);
      existing.count += 1;
      posPaymentMap.set(m, existing);
    }
    const posPaymentMix: PaymentMethodBreakdown[] = Array.from(posPaymentMap.entries())
      .map(([method, v]) => ({ method, revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Top 10 items by revenue ───────────────────────────────────────
    // Filter items only from completed orders in period
    const completedOrderIds = new Set(orders.map((o) => o.id));
    const itemMap = new Map<string, { label: string; revenue: number; count: number }>();
    for (const item of orderItems) {
      const orderInfo = item.orders as { created_at: string; status: string } | null;
      if (!orderInfo || orderInfo.status !== "completed") continue;
      if (!completedOrderIds.has((item as { order_id?: string }).order_id ?? "")) continue;
      const mat = item.materials as { name: string } | null;
      const key = item.material_id;
      const label = mat?.name ?? "Unknown";
      const lineRevenue = Number(item.quantity) * Number(item.unit_price);
      const existing = itemMap.get(key) ?? { label, revenue: 0, count: 0 };
      existing.revenue += lineRevenue;
      existing.count += Number(item.quantity);
      itemMap.set(key, existing);
    }
    const topItems: BarItem[] = Array.from(itemMap.entries())
      .map(([id, v]) => ({ id, label: v.label, revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ── Booking by tier ───────────────────────────────────────────────
    const tierMap = new Map<string, { label: string; revenue: number; count: number }>();
    for (const b of bookings) {
      const tier = b.tiers as { id: string; name: string } | null;
      if (!tier) continue;
      const existing = tierMap.get(tier.id) ?? { label: tier.name, revenue: 0, count: 0 };
      existing.revenue += Number(b.total_price);
      existing.count += 1;
      tierMap.set(tier.id, existing);
    }
    const bookingRevenueByTier: BarItem[] = Array.from(tierMap.entries())
      .map(([id, v]) => ({ id, label: v.label, revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Booking by experience ─────────────────────────────────────────
    const expMap = new Map<string, { label: string; revenue: number; count: number }>();
    for (const b of bookings) {
      const exp = b.experiences as { id: string; name: string } | null;
      if (!exp) continue;
      const existing = expMap.get(exp.id) ?? { label: exp.name, revenue: 0, count: 0 };
      existing.revenue += Number(b.total_price);
      existing.count += 1;
      expMap.set(exp.id, existing);
    }
    const bookingRevenueByExperience: BarItem[] = Array.from(expMap.entries())
      .map(([id, v]) => ({ id, label: v.label, revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Booking payment mix ───────────────────────────────────────────
    const bkPaymentMap = new Map<string, { revenue: number; count: number }>();
    for (const p of bookingPayments) {
      const m = p.method ?? "unknown";
      const existing = bkPaymentMap.get(m) ?? { revenue: 0, count: 0 };
      existing.revenue += Number(p.amount);
      existing.count += 1;
      bkPaymentMap.set(m, existing);
    }
    const bookingPaymentMix: PaymentMethodBreakdown[] = Array.from(bkPaymentMap.entries())
      .map(([method, v]) => ({ method, revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Daily revenue trend ───────────────────────────────────────────
    const dailyMap = new Map<string, { pos: number; booking: number }>();
    for (const o of orders) {
      const date = o.created_at.split("T")[0]!;
      const ex = dailyMap.get(date) ?? { pos: 0, booking: 0 };
      ex.pos += Number(o.total_amount);
      dailyMap.set(date, ex);
    }
    for (const b of bookings) {
      const date = b.created_at.split("T")[0]!;
      const ex = dailyMap.get(date) ?? { pos: 0, booking: 0 };
      ex.booking += Number(b.total_price);
      dailyMap.set(date, ex);
    }
    const dailyTrend: DailyRevenue[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, posRevenue: v.pos, bookingRevenue: v.booking }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Slot utilization ──────────────────────────────────────────────
    const slotDayMap = new Map<string, { booked: number; capacity: number }>();
    for (const slot of timeSlots) {
      const exp = slot.experiences as { capacity_per_slot: number | null } | null;
      const cap = slot.override_capacity ?? exp?.capacity_per_slot ?? 0;
      if (cap <= 0) continue;
      const existing = slotDayMap.get(slot.slot_date) ?? { booked: 0, capacity: 0 };
      existing.booked += slot.booked_count ?? 0;
      existing.capacity += cap;
      slotDayMap.set(slot.slot_date, existing);
    }
    const slotUtilization: SlotUtilDay[] = Array.from(slotDayMap.entries())
      .map(([date, v]) => ({
        date,
        utilPct: v.capacity > 0 ? Math.min(100, Math.round((v.booked / v.capacity) * 100)) : 0,
        bookedCount: v.booked,
        capacity: v.capacity,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      periodFrom: bounds.from,
      periodTo: bounds.to,
      totalRevenue: posRevenue + bookingRevenue,
      posRevenue,
      bookingRevenue,
      avgPosTicket,
      avgBookingValue,
      orderCount,
      bookingCount,
      posRevenueByPoint,
      topItems,
      posPaymentMix,
      bookingRevenueByTier,
      bookingRevenueByExperience,
      bookingPaymentMix,
      dailyTrend,
      slotUtilization,
    };
  },
);

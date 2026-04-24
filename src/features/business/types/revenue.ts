/** View-model types for the Revenue deep-dive page. */

export type BarItem = Readonly<{
  id: string;
  label: string;
  revenue: number;
  count?: number;
}>;

export type PaymentMethodBreakdown = Readonly<{
  method: string;
  revenue: number;
  count: number;
}>;

export type DailyRevenue = Readonly<{
  date: string;
  posRevenue: number;
  bookingRevenue: number;
}>;

export type SlotUtilDay = Readonly<{
  date: string;
  /** 0-100 percentage */
  utilPct: number;
  bookedCount: number;
  capacity: number;
}>;

export type RevenueDashboardData = Readonly<{
  periodFrom: string;
  periodTo: string;

  // ── KPIs ──────────────────────────────────────────────────────────
  totalRevenue: number;
  posRevenue: number;
  bookingRevenue: number;
  avgPosTicket: number | null;
  avgBookingValue: number | null;
  orderCount: number;
  bookingCount: number;

  // ── POS breakdown ──────────────────────────────────────────────────
  posRevenueByPoint: ReadonlyArray<BarItem>;
  topItems: ReadonlyArray<BarItem>;
  posPaymentMix: ReadonlyArray<PaymentMethodBreakdown>;

  // ── Booking breakdown ──────────────────────────────────────────────
  bookingRevenueByTier: ReadonlyArray<BarItem>;
  bookingRevenueByExperience: ReadonlyArray<BarItem>;
  bookingPaymentMix: ReadonlyArray<PaymentMethodBreakdown>;

  // ── Trend ──────────────────────────────────────────────────────────
  dailyTrend: ReadonlyArray<DailyRevenue>;

  // ── Slot utilization ───────────────────────────────────────────────
  slotUtilization: ReadonlyArray<SlotUtilDay>;
}>;

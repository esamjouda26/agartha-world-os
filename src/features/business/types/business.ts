/** View-model types for the Executive Dashboard. */

export type RevenuePoint = Readonly<{
  /** ISO date string — YYYY-MM-DD. */
  date: string;
  posRevenue: number;
  bookingRevenue: number;
}>;

export type BusinessDashboardData = Readonly<{
  // ── Period boundaries ──────────────────────────────────────────────
  periodFrom: string;
  periodTo: string;
  hasComparison: boolean;

  // ── Revenue strip ──────────────────────────────────────────────────
  posRevenue: number;
  bookingRevenue: number;
  totalRevenue: number;
  priorPosRevenue: number | null;
  priorBookingRevenue: number | null;
  priorTotalRevenue: number | null;

  // ── Revenue trend sparkline ────────────────────────────────────────
  revenueTrend: ReadonlyArray<RevenuePoint>;

  // ── Operations strip ───────────────────────────────────────────────
  currentOccupancy: number;
  totalCapacity: number;
  openIncidents: number;
  activeMaintenanceWOs: number;

  // ── Guest strip ────────────────────────────────────────────────────
  /** Null when no survey responses in period. */
  npsScore: number | null;
  avgVisitRating: number | null;
  surveyCount: number;

  // ── Workforce strip ────────────────────────────────────────────────
  scheduledToday: number;
  presentToday: number;
  unjustifiedExceptionsThisWeek: number;
}>;

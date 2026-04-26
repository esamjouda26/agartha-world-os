import type { Database } from "@/types/database";

export type SurveySentiment = Database["public"]["Enums"]["survey_sentiment"];
export type SurveyType = Database["public"]["Enums"]["survey_type"];
export type SurveySource = Database["public"]["Enums"]["survey_source"];
export type LifecycleStatus = Database["public"]["Enums"]["lifecycle_status"];
export type DiscountType = Database["public"]["Enums"]["discount_type"];

export type RecentFeedbackRow = Readonly<{
  id: string;
  sentiment: SurveySentiment | null;
  feedbackText: string | null;
  overallScore: number | null;
  createdAt: string;
}>;

// ── Campaigns ─────────────────────────────────────────────────────────────

export type CampaignRow = Readonly<{
  id: string;
  name: string;
  description: string | null;
  status: LifecycleStatus;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  promoCount: number;
  totalRedemptions: number;
  createdAt: string;
}>;

export type CampaignListData = Readonly<{
  rows: ReadonlyArray<CampaignRow>;
  counts: Readonly<Record<LifecycleStatus, number>>;
  kpis: Readonly<{
    activeCount: number;
    totalPromos: number;
    totalRedemptions: number;
    totalBudget: number;
  }>;
}>;

// ── Promo Codes ───────────────────────────────────────────────────────────

export type PromoCodeRow = Readonly<{
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  campaignId: string | null;
  campaignName: string | null;
  status: LifecycleStatus;
  validFrom: string;
  validTo: string;
  validDaysMask: number | null;
  validTimeStart: string | null;
  validTimeEnd: string | null;
  minGroupSize: number;
  tierIds: ReadonlyArray<string>;
  tierNames: ReadonlyArray<string>;
}>;

export type PromoTabKey = "draft" | "active" | "expired" | "paused";

export type PromoListData = Readonly<{
  rows: ReadonlyArray<PromoCodeRow>;
  counts: Readonly<Record<PromoTabKey, number>>;
  campaigns: ReadonlyArray<{
    id: string;
    name: string;
  }>;
  tiers: ReadonlyArray<{
    id: string;
    name: string;
  }>;
}>;

// ── Survey analytics ──────────────────────────────────────────────────────

export type GuestSurveyRow = Readonly<{
  id: string;
  surveyType: SurveyType;
  source: SurveySource | null;
  sentiment: SurveySentiment | null;
  overallScore: number | null;
  npsScore: number | null;
  keywords: ReadonlyArray<string>;
  feedbackText: string | null;
  bookingRef: string | null;
  experienceName: string | null;
  createdAt: string;
}>;

export type StaffFeedbackRow = Readonly<{
  id: string;
  submittedById: string | null;
  submittedByName: string | null;
  sentiment: SurveySentiment | null;
  feedbackText: string | null;
  keywords: ReadonlyArray<string>;
  overallScore: number | null;
  bookingRef: string | null;
  createdAt: string;
}>;

export type SurveysData = Readonly<{
  guestRows: ReadonlyArray<GuestSurveyRow>;
  staffRows: ReadonlyArray<StaffFeedbackRow>;
  /** ISO bounds actually used by the query so the client filter agrees. */
  range: Readonly<{ from: string | null; to: string | null }>;
  /**
   * Staff feedback count for the current calendar month — computed
   * INDEPENDENTLY of `range` so the "This month" KPI on the staff tab
   * (frontend_spec.md:2616) is a fixed at-a-glance reference and does
   * not collapse to 0 when the user picks a date range that excludes
   * the current month. Other staff KPIs (sentiment %, top theme) still
   * reflect the user's selected range.
   */
  staffThisMonthCount: number;
}>;

/**
 * Marketing / Survey feature constants.
 * Every magic string lives here — not in component files.
 */

import type { Database } from "@/types/database";
import type { SurveySentiment } from "@/features/marketing/types";

// ── Rate limits ───────────────────────────────────────────────────────────

export const SUBMIT_FEEDBACK_RATE_TOKENS = 20;
export const SUBMIT_FEEDBACK_RATE_WINDOW = "60 s" as const;

export const MARKETING_CRUD_RATE_TOKENS = 30;
export const MARKETING_CRUD_RATE_WINDOW = "60 s" as const;

// ── Lifecycle status (campaigns + promo_codes) ────────────────────────────

type LifecycleStatus = Database["public"]["Enums"]["lifecycle_status"];

/**
 * Display label per lifecycle_status enum.
 * init_schema.sql:114 — ('draft', 'active', 'paused', 'completed').
 */
export const LIFECYCLE_LABEL: Record<LifecycleStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
} as const;

/**
 * Allowed lifecycle status transitions.
 * draft → active. active ↔ paused. paused → active or completed.
 * `completed` is terminal in the DB; the spec also surfaces it as a
 * frontend-derived badge when end_date < NOW() AND status active|paused.
 */
export const CAMPAIGN_STATUS_OPTIONS: ReadonlyArray<LifecycleStatus> = [
  "draft",
  "active",
  "paused",
  "completed",
] as const;

// ── UI display maps ───────────────────────────────────────────────────────

/**
 * Badge variant per survey sentiment.
 * Mirrors survey_sentiment enum: init_schema.sql:5743.
 */
export const SENTIMENT_VARIANT: Record<
  SurveySentiment,
  "default" | "secondary" | "destructive" | "outline"
> = {
  positive: "default",
  neutral: "outline",
  negative: "destructive",
} as const;

/**
 * Display label per survey sentiment.
 */
export const SENTIMENT_LABEL: Record<SurveySentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
} as const;

/**
 * Marketing / Survey feature constants.
 * Every magic string lives here — not in component files.
 */

import type { SurveySentiment } from "@/features/marketing/types";

// ── Rate limits ───────────────────────────────────────────────────────────

export const SUBMIT_FEEDBACK_RATE_TOKENS = 20;
export const SUBMIT_FEEDBACK_RATE_WINDOW = "60 s" as const;

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

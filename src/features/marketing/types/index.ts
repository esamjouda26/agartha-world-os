import type { Database } from "@/types/database";

export type SurveySentiment = Database["public"]["Enums"]["survey_sentiment"];

export type RecentFeedbackRow = Readonly<{
  id: string;
  sentiment: SurveySentiment | null;
  feedbackText: string | null;
  overallScore: number | null;
  createdAt: string;
}>;

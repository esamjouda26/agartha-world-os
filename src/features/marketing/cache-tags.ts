export const MARKETING_ROUTER_PATHS = [
  "/[locale]/crew/feedback",
  "/[locale]/management/marketing/surveys",
] as const;

export function surveyResponseTag(userId: string): string {
  return `marketing:survey:${userId}`;
}

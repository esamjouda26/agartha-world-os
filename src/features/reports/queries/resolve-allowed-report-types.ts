import "server-only";

import { REPORT_DOMAINS, REPORT_TYPES, type ReportType } from "@/features/reports/constants";

/**
 * Derive the caller's allowed report types from their JWT domain set.
 *
 * A user sees a report type iff they hold `r` access on at least one
 * of the report's owning domain(s). Write-only grants (e.g. `hr:u`
 * without `hr:r`) do not grant report visibility — a report consumer
 * needs read access on the underlying data.
 *
 * Admins (`it_admin`, `business_admin`) hold every `permission_domain`
 * with full CRUD per seed data
 * ([init_schema.sql:649-654](../../../../supabase/migrations/20260417064731_init_schema.sql#L649)),
 * so this filter naturally returns every report type for them —
 * no explicit admin override needed, and no conflating `access_level`
 * (routing chrome) with auth logic.
 *
 * Pure function of the JWT — no DB round-trip, no `cache()` needed.
 */
export function resolveAllowedReportTypes(params: {
  domains: Readonly<Record<string, readonly string[]>> | undefined;
}): ReportType[] {
  const domains = params.domains ?? {};
  const held = new Set(Object.keys(domains).filter((d) => (domains[d] ?? []).includes("r")));
  return REPORT_TYPES.filter((t) => REPORT_DOMAINS[t].some((d) => held.has(d)));
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DomainReportsPage } from "@/components/shared/domain-reports-page";
import { listRecentExecutions } from "@/features/reports/queries/list-executions";
import { listSavedReports } from "@/features/reports/queries/list-reports";
import { resolveAllowedReportTypes } from "@/features/reports/queries/resolve-allowed-report-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/management/reports` — Pattern C route wrapper. Managers see only
 * report types matching their domains (resolved from JWT).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Reports · Management",
  description: "Generate and schedule reports for your domain.",
};

export default async function ManagementReportsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const allowedReportTypes = resolveAllowedReportTypes({ domains: appMeta.domains });

  const [schedules, executions] = await Promise.all([
    listSavedReports(user.id),
    listRecentExecutions(user.id),
  ]);

  return (
    <DomainReportsPage
      allowedReportTypes={allowedReportTypes}
      schedules={schedules}
      executions={executions}
    />
  );
}

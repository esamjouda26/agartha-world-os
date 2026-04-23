import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DomainReportsPage } from "@/components/shared/domain-reports-page";
import { listRecentExecutions } from "@/features/reports/queries/list-executions";
import { listSavedReports } from "@/features/reports/queries/list-reports";
import { resolveAllowedReportTypes } from "@/features/reports/queries/resolve-allowed-report-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/admin/reports` — Pattern C route wrapper. Admin view shows every
 * report type (via `system:r` override in `resolveAllowedReportTypes`).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Reports · Admin",
  description: "Generate or schedule reports across every domain.",
};

export default async function AdminReportsPage({
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

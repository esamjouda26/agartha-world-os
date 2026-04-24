import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSystemDashboard } from "@/features/it/queries/get-system-dashboard";
import { SystemDashboardView } from "@/features/it/components/system-dashboard-view";

/**
 * `/admin/it` — IT System Dashboard (Pattern C route wrapper).
 *
 * Resolves auth server-side, fetches all dashboard aggregates via the
 * `getSystemDashboard` cached query, and injects the result as explicit
 * props into `<SystemDashboardView>`.
 *
 * RBAC: The landing page uses an EXACT_BYPASS in middleware. Gate 5 is
 * enforced via the `it:c` domain check that the middleware `/admin`
 * redirect already performed.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal.admin");
  return {
    title: "System Dashboard · Admin",
    description: t("description"),
  };
}

export default async function AdminITPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const data = await getSystemDashboard(supabase);

  return <SystemDashboardView data={data} />;
}

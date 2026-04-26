import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReorderDashboard } from "@/features/procurement/queries/get-reorder-dashboard";
import { ReorderDashboardView } from "@/features/procurement/components/reorder-dashboard-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Reorder Dashboard · Procurement",
  description:
    "Stock levels vs reorder points — create draft purchase orders for materials below threshold.",
};

export default async function ReorderDashboardPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Domain gate: procurement:c per spec
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  if (!procAccess.includes("c")) {
    redirect(`/${locale}/auth/access-revoked`);
  }

  const data = await getReorderDashboard(supabase);

  return <ReorderDashboardView data={data} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOperationsDashboard,
  resolvePeriodBounds,
} from "@/features/operations/queries/get-operations-dashboard";
import { OperationsDashboardView } from "@/features/operations/components/operations-dashboard-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Operations · Admin",
    description: "Live facility occupancy, incident status, and maintenance impact.",
  };
}

export default async function AdminOperationsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { locale } = await params;
  const sp = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const bounds = resolvePeriodBounds({
    range: typeof sp.range === "string" ? sp.range : null,
  });

  const data = await getOperationsDashboard(supabase, bounds);

  return <OperationsDashboardView data={data} />;
}

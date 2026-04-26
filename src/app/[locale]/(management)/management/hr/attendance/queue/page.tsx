import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDiscrepancyQueueData } from "@/features/hr/queries/get-discrepancy-queue";
import { discrepancyQueueFiltersSchema } from "@/features/hr/schemas/discrepancy-queue-filters";
import { DiscrepancyQueueView } from "@/features/hr/components/discrepancy-queue-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Discrepancy Queue · HR",
    description: "HR action-required inbox for attendance exception clarifications.",
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function stringOnly(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function DiscrepancyQueuePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login` as never);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("r")) redirect(`/${locale}/management/hr` as never);

  const pageSizeRaw = stringOnly(sp.pageSize);
  const filters = discrepancyQueueFiltersSchema.parse({
    exceptionType: stringOnly(sp.exceptionType),
    search: stringOnly(sp.search),
    cursor: stringOnly(sp.cursor),
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
  });

  const data = await getDiscrepancyQueueData(supabase, filters);

  return <DiscrepancyQueueView data={data} canUpdate={hrAccess.includes("u")} />;
}

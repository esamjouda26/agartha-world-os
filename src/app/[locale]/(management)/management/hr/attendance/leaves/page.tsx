import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLeaveManagementData } from "@/features/hr/queries/get-leave-management";
import { leaveManagementFiltersSchema } from "@/features/hr/schemas/leave-management-filters";
import { LeaveManagementView } from "@/features/hr/components/leave-management-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Leave Management · HR",
    description: "Leave requests, balances, ledger, and policy configuration.",
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function stringOnly(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function LeavesPage({
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
  const filters = leaveManagementFiltersSchema.parse({
    tab: stringOnly(sp.tab),
    status: stringOnly(sp.status),
    leaveTypeId: stringOnly(sp.leaveTypeId),
    search: stringOnly(sp.search),
    cursor: stringOnly(sp.cursor),
    historyCursor: stringOnly(sp.historyCursor),
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
  });

  const data = await getLeaveManagementData(supabase, filters);

  return (
    <LeaveManagementView
      data={data}
      canCreate={hrAccess.includes("c")}
      canUpdate={hrAccess.includes("u")}
      canDelete={hrAccess.includes("d")}
    />
  );
}

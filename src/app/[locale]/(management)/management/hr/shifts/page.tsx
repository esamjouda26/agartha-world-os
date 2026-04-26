import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getShiftsData } from "@/features/hr/queries/get-shifts-data";
import { listScheduleOverview } from "@/features/hr/queries/list-schedule-overview";
import { shiftOverviewFiltersSchema } from "@/features/hr/schemas/shift-overview-filters";
import { ShiftSchedulingView } from "@/features/hr/components/shift-scheduling-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Shift Scheduling · HR",
    description: "Roster templates, schedule overview, and daily overrides.",
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function stringOnly(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function ShiftsPage({
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
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  const canWrite = hrAccess.includes("c");
  const canApply = hrAccess.includes("u");

  const pageSizeRaw = stringOnly(sp.pageSize);
  const filters = shiftOverviewFiltersSchema.parse({
    staffSearch: stringOnly(sp.staffSearch),
    shiftTypeId: stringOnly(sp.shiftTypeId),
    override: stringOnly(sp.override),
    from: stringOnly(sp.from),
    to: stringOnly(sp.to),
    cursor: stringOnly(sp.cursor),
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
  });

  const [data, overviewPage] = await Promise.all([
    getShiftsData(supabase),
    listScheduleOverview(supabase, filters),
  ]);

  return (
    <ShiftSchedulingView
      data={data}
      overviewPage={overviewPage}
      canWrite={canWrite}
      canApply={canApply}
    />
  );
}

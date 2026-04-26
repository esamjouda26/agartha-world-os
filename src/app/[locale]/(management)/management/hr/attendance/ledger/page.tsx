import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAttendanceLedgerData } from "@/features/hr/queries/get-attendance-ledger";
import { AttendanceLedgerView } from "@/features/hr/components/attendance-ledger-view";
import { attendanceLedgerFiltersSchema } from "@/features/hr/schemas/attendance-ledger-filters";

/**
 * `/management/hr/attendance/ledger` — Pattern C route wrapper.
 *
 * Parses URL searchParams through Zod → injects server-fetched page
 * into the client view. Mirrors `management/audit/page.tsx`.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Attendance Ledger · HR",
    description: "Read-only attendance records with derived status and HR actions.",
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function stringOnly(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function AttendanceLedgerPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ locale: string }>; searchParams: SearchParams }>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login` as never);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("r")) redirect(`/${locale}/management/hr` as never);
  const canUpdate = hrAccess.includes("u");

  const pageSizeRaw = stringOnly(sp.pageSize);
  const pageSizeNumber = pageSizeRaw ? Number(pageSizeRaw) : undefined;

  const filters = attendanceLedgerFiltersSchema.parse({
    from: stringOnly(sp.from),
    to: stringOnly(sp.to),
    status: stringOnly(sp.status),
    orgUnit: stringOnly(sp.orgUnit),
    shiftType: stringOnly(sp.shiftType),
    search: stringOnly(sp.search),
    cursor: stringOnly(sp.cursor),
    pageSize: pageSizeNumber,
  });

  const [page, leaveTypesRes] = await Promise.all([
    getAttendanceLedgerData(supabase, filters),
    supabase.from("leave_types").select("id, name, code").eq("is_active", true).order("name"),
  ]);

  const leaveTypes = (leaveTypesRes.data ?? []).map((lt) => ({
    id: lt.id,
    name: lt.name,
    code: lt.code,
  }));

  return <AttendanceLedgerView page={page} canUpdate={canUpdate} leaveTypes={leaveTypes} />;
}

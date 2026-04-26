import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LeavePage } from "@/components/shared/leave-page";
import { getMyLeave } from "@/features/hr/queries/get-my-leave";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/management/leave` — Pattern C route wrapper (ADR-0007).
 * Resolves the authenticated user server-side, fetches leave data,
 * then injects the resolved context into the shared `<LeavePage>`.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Leave · Management",
  description: "Your leave balances, requests, and history.",
};

export default async function ManagementLeavePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    year?: string;
    leave_type?: string;
    past_status?: string;
  }>;
}>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const parsedYear = sp.year ? parseInt(sp.year, 10) : NaN;
  const validYear = !isNaN(parsedYear) && parsedYear > 0 ? parsedYear : undefined;

  const filters: { year?: number; leaveTypeId?: string; pastStatus?: string } = {};
  if (validYear !== undefined) filters.year = validYear;
  if (sp.leave_type) filters.leaveTypeId = sp.leave_type;
  if (sp.past_status) filters.pastStatus = sp.past_status;

  const leaveData = await getMyLeave(supabase, user.id, filters);

  return (
    <LeavePage
      leaveData={leaveData}
      filters={{
        year: sp.year || String(new Date().getFullYear()),
        leaveTypeId: sp.leave_type || "",
        pastStatus: sp.past_status || "",
      }}
    />
  );
}

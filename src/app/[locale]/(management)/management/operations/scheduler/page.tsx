import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSchedulerData } from "@/features/operations/queries/get-scheduler-data";
import { SchedulerView } from "@/features/operations/components/scheduler-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Operational Timeline · Operations",
  description: "Slot utilization, booking calendar, and capacity overrides.",
};

export default async function OperationsSchedulerPage({
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

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const bookingAccess = appMeta.domains?.booking ?? [];
  if (!bookingAccess.includes("r")) redirect(`/${locale}/management`);
  const canEdit = bookingAccess.includes("u");

  const experienceId = typeof sp.experience === "string" ? sp.experience : undefined;
  const date = typeof sp.date === "string" ? sp.date : undefined;

  const data = await getSchedulerData({ experienceId, date });

  return <SchedulerView data={data} canEdit={canEdit} />;
}

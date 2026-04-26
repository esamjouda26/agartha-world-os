import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExperiencesData } from "@/features/operations/queries/get-experiences-data";
import { ExperienceConfigView } from "@/features/operations/components/experience-config-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Experience Config · Operations",
  description: "Configure experiences, tier templates, and scheduler auto-generation settings.",
};

/**
 * `/management/operations/experiences` — Pattern C route wrapper.
 * 3-tab CRUD page. Gate on `booking:c` per frontend_spec §3e.
 */
export default async function OperationsExperiencesPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const bookingAccess = appMeta.domains?.booking ?? [];
  if (!bookingAccess.includes("c")) redirect(`/${locale}/management`);
  const canWrite = bookingAccess.includes("c") || bookingAccess.includes("u");

  const data = await getExperiencesData();

  return <ExperienceConfigView data={data} canWrite={canWrite} />;
}

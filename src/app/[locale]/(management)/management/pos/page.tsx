import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPosPoints } from "@/features/pos/queries/get-pos-points";
import { PosPointsView } from "@/features/pos/components/pos-points-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "POS Points · POS",
    description: "Manage POS point configuration — the physical registers and terminals where sales occur.",
  };
}

export default async function ManagementPosPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Domain gating: visible to pos:c users; CRUD write requires system:c/system:u
  // (enforced server-side in the Server Action, not just the UI)
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const posAccess = appMeta.domains?.pos ?? [];
  if (!posAccess.includes("c") && !posAccess.includes("r")) {
    redirect(`/${locale}/management`);
  }

  const systemAccess = appMeta.domains?.system ?? [];
  const canWrite = systemAccess.includes("c") || systemAccess.includes("u");

  const data = await getPosPoints(supabase);

  return <PosPointsView data={data} canWrite={canWrite} />;
}

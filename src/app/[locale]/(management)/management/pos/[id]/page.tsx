import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPosPointDetail } from "@/features/pos/queries/get-pos-point-detail";
import { PosPointDetailView } from "@/features/pos/components/pos-point-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pos_points")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data?.display_name ? `${data.display_name} · POS Points` : "POS Point Detail",
    description: "Configure catalog, display categories, and BOM recipes for this terminal.",
  };
}

export default async function PosPointDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const posAccess = appMeta.domains?.pos ?? [];
  if (!posAccess.includes("c") && !posAccess.includes("r")) {
    redirect(`/${locale}/management`);
  }

  const canWrite = posAccess.includes("c") || posAccess.includes("u");

  const data = await getPosPointDetail(supabase, id);
  if (!data) notFound();

  return <PosPointDetailView data={data} canWrite={canWrite} />;
}

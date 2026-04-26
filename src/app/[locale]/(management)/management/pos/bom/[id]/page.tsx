import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBomDetail } from "@/features/pos/queries/get-bom-detail";
import { BomDetailView } from "@/features/pos/components/bom-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bill_of_materials")
    .select("version, materials!bill_of_materials_parent_material_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();

  const parent = data?.materials as { name: string } | null;
  const title = parent
    ? `${parent.name} v${data?.version ?? 1} · BOM`
    : "BOM Detail";

  return {
    title,
    description: "Manage component list for this BOM version.",
  };
}

export default async function BomDetailPage({
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
  const canDelete = posAccess.includes("d");

  const data = await getBomDetail(supabase, id);
  if (!data) notFound();

  return <BomDetailView data={data} canWrite={canWrite} canDelete={canDelete} />;
}

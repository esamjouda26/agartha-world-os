import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMaterialDetail } from "@/features/procurement/queries/get-material-detail";
import { MaterialDetailView } from "@/features/procurement/components/material-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("materials")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data?.name
      ? `${data.name} · Material Detail · Procurement`
      : "Material Detail · Procurement",
    description:
      "View material properties, supplier links, stock status, and UOM conversions.",
  };
}

export default async function MaterialDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Domain access: procurement OR pos
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  const posAccess = appMeta.domains?.pos ?? [];
  const canWrite =
    procAccess.includes("u") ||
    procAccess.includes("c") ||
    posAccess.includes("u") ||
    posAccess.includes("c");

  const detailData = await getMaterialDetail(supabase, id);
  if (!detailData) notFound();

  return <MaterialDetailView data={detailData} canWrite={canWrite} />;
}

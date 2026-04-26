import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupplierDetail } from "@/features/procurement/queries/get-supplier-detail";
import { SupplierDetailView } from "@/features/procurement/components/supplier-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("suppliers")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data?.name
      ? `${data.name} · Supplier Detail · Procurement`
      : "Supplier Detail · Procurement",
    description:
      "Supplier detail with linked materials and purchase order history.",
  };
}

export default async function SupplierDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Domain access — procurement
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  const canWrite = procAccess.includes("u") || procAccess.includes("c");

  const detailData = await getSupplierDetail(supabase, id);
  if (!detailData) notFound();

  return <SupplierDetailView data={detailData} canWrite={canWrite} />;
}

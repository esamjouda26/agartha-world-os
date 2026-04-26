import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSuppliersList } from "@/features/procurement/queries/get-suppliers-list";
import { SuppliersListView } from "@/features/procurement/components/suppliers-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Suppliers · Procurement",
  description:
    "Supplier registry — manage contacts, linked materials, and purchase order activity.",
};

export default async function SuppliersPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
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
  const canWrite = procAccess.includes("c") || procAccess.includes("u");

  const data = await getSuppliersList(supabase);

  return <SuppliersListView data={data} canWrite={canWrite} />;
}

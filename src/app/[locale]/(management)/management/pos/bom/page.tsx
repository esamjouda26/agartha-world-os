import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBoms } from "@/features/pos/queries/get-boms";
import { BomListView } from "@/features/pos/components/bom-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Bill of Materials · POS",
    description: "Manage recipes for finished and semi-finished materials.",
  };
}

export default async function BomListPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
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

  const data = await getBoms(supabase);

  return <BomListView data={data} canWrite={canWrite} />;
}

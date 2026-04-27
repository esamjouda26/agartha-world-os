import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrders } from "@/features/pos/queries/get-active-orders";
import { KDSView } from "@/features/pos/components/kds-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Active Orders — KDS",
    description: "Real-time kitchen display showing all preparing orders.",
  };
}

export default async function CrewActiveOrdersPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const initialOrders = await getActiveOrders(supabase);

  return <KDSView initialOrders={initialOrders} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyWorkOrders } from "@/features/maintenance/queries/get-my-work-orders";
import { WorkOrderList } from "@/features/maintenance/components/work-order-list";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Work Orders",
    description: "View and manage your assigned maintenance work orders.",
  };
}

export default async function CrewMaintenanceOrdersPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const orders = await getMyWorkOrders(supabase, user.id);

  return <WorkOrderList orders={orders} />;
}

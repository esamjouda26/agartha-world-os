import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrders } from "@/features/pos/queries/get-orders";
import { OrderMonitorView } from "@/features/pos/components/order-monitor-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Order Monitor · POS",
    description: "Monitor active and recent POS orders across all terminals.",
  };
}

export default async function PosOrdersPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}>) {
  const { locale } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const posAccess = appMeta.domains?.pos ?? [];
  if (!posAccess.includes("r") && !posAccess.includes("c")) {
    redirect(`/${locale}/management`);
  }

  const canCancel = posAccess.includes("u");

  const status = (sp["status"] ?? "preparing") as "preparing" | "completed" | "cancelled";
  const posPointId = sp["pp"];
  const startDate = sp["from"];
  const endDate = sp["to"];
  const cursor = sp["cursor"];

  const data = await getOrders(supabase, {
    status,
    ...(posPointId !== undefined ? { posPointId } : {}),
    ...(startDate !== undefined ? { startDate } : {}),
    ...(endDate !== undefined ? { endDate } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  });

  return <OrderMonitorView initialData={data} canCancel={canCancel} />;
}

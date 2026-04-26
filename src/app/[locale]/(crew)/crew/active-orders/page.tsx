import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrewPageHeader } from "@/components/shared/crew-page-header";
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

  // Pattern C: RSC resolves initial data via server-only cached fetcher (ADR-0006).
  // KDSView's React Query uses the dual-use fetchActiveOrders for client-side refetches.
  const initialOrders = await getActiveOrders(supabase);

  return (
    <div className="flex h-full flex-col" data-testid="kds-page">
      <CrewPageHeader title="Active Orders" subtitle="Live kitchen display — updates in real time" />
      <div className="flex-1 overflow-y-auto">
        <KDSView initialOrders={initialOrders} />
      </div>
    </div>
  );
}

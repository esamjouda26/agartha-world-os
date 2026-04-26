import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStockCounts } from "@/features/inventory/queries/get-stock-counts";
import { StockCountView } from "@/features/inventory/components/stock-count-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Stock Count", description: "Enter physical quantities for assigned stock counts." };
}

export default async function CrewStockCountPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const reconciliations = await getStockCounts(supabase, user.id);

  return (
    <div className="flex h-full flex-col" data-testid="stock-count-page">
      <CrewPageHeader title="Stock Count" subtitle="Blind count — enter physical quantities" />
      <div className="flex-1 overflow-y-auto">
        <StockCountView reconciliations={reconciliations} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReceivablePos } from "@/features/procurement/queries/get-receivable-pos";
import { PoReceivingView } from "@/features/procurement/components/po-receiving-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "PO Receiving", description: "Receive goods against purchase orders." };
}

export default async function CrewPoReceivingPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const pos = await getReceivablePos(supabase);

  return (
    <div className="flex h-full flex-col" data-testid="po-receiving-page">
      <CrewPageHeader title="PO Receiving" subtitle="Enter received quantities for incoming orders" />
      <div className="flex-1 overflow-y-auto">
        <PoReceivingView pos={pos} />
      </div>
    </div>
  );
}

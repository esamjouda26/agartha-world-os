import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const pos = await getReceivablePos(supabase);

  return <PoReceivingView pos={pos} />;
}

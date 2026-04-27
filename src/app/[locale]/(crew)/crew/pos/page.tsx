import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPosContext } from "@/features/pos/queries/get-pos-context";
import { PosTerminal } from "@/features/pos/components/pos-terminal";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "POS Terminal",
    description: "Place orders from the POS catalog for your location.",
  };
}

export default async function CrewPosPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const posContext = await getPosContext(supabase, user.id);

  return <PosTerminal posContext={posContext} />;
}

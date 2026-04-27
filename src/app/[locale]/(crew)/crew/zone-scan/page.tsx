import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getZoneScanContext } from "@/features/operations/queries/get-zone-scan-context";
import { ZoneScanView } from "@/features/operations/components/zone-scan-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Zone Declaration",
    description: "Declare your current zone by scanning the QR code.",
  };
}

export default async function CrewZoneScanPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const context = await getZoneScanContext(supabase, user.id);

  return <ZoneScanView initialContext={context} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSystemHealth } from "@/features/it/queries/get-system-health";
import { SystemHealthView } from "@/features/it/components/system-health-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "System Health · Admin",
    description: "Real-time device heartbeat status and zone sensor telemetry.",
  };
}

export default async function AdminSystemHealthPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const data = await getSystemHealth(supabase);

  return <SystemHealthView data={data} />;
}

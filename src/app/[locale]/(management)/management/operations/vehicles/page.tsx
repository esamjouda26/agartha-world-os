import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVehicles } from "@/features/operations/queries/get-vehicles";
import { VehicleFleetView } from "@/features/operations/components/vehicle-fleet-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Vehicle Fleet · Operations",
  description: "Vehicle fleet registry management.",
};

export default async function OperationsVehiclesPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const opsAccess = appMeta.domains?.ops ?? [];
  if (!opsAccess.includes("c")) redirect(`/${locale}/management`);
  const canWrite = opsAccess.includes("c") || opsAccess.includes("u");
  const canDelete = opsAccess.includes("d");

  const data = await getVehicles();

  return <VehicleFleetView data={data} canWrite={canWrite} canDelete={canDelete} />;
}

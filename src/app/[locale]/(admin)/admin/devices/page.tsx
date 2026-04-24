import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeviceList } from "@/features/devices/queries/get-device-list";
import { DeviceRegistryView } from "@/features/devices/components/device-registry-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Device Registry · Admin",
    description: "Monitor and manage all physical devices in the IT estate.",
  };
}

export default async function AdminDevicesPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // RBAC: it:r required for list; it:c/it:u for mutations (enforced per action)
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const itAccess = appMeta.domains?.it ?? [];
  const canWrite = itAccess.includes("c") || itAccess.includes("u");

  const data = await getDeviceList(supabase);

  return <DeviceRegistryView data={data} canWrite={canWrite} />;
}

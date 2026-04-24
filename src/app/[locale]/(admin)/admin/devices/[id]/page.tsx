import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeviceDetail } from "@/features/devices/queries/get-device-detail";
import { DeviceDetailView } from "@/features/devices/components/device-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const data = await getDeviceDetail(supabase, id);
  const name = data?.device.name ?? "Device";
  return {
    title: `${name} · Device Registry · Admin`,
    description: `Device detail for ${name}.`,
  };
}

export default async function AdminDeviceDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const data = await getDeviceDetail(supabase, id);
  if (!data) notFound();

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const itAccess = appMeta.domains?.it ?? [];
  const canEdit = itAccess.includes("u");

  return <DeviceDetailView data={data} canEdit={canEdit} />;
}

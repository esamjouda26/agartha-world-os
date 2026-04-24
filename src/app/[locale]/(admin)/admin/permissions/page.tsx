import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPermissionsPage } from "@/features/permissions/queries/get-permissions-page";
import { PermissionsPageView } from "@/features/permissions/components/permissions-page-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Permissions · Admin",
    description: "Manage roles and the domain permission matrix.",
  };
}

export default async function AdminPermissionsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const systemAccess = appMeta.domains?.system ?? [];
  const canWrite = systemAccess.includes("c") || systemAccess.includes("u");

  const data = await getPermissionsPage(supabase);

  return <PermissionsPageView data={data} canWrite={canWrite} />;
}

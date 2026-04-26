import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUomConversionsPage } from "@/features/procurement/queries/get-uom-conversions-page";
import { UomConversionsPage } from "@/components/shared/uom-conversions-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "UOM Conversions · IT",
    description:
      "System-wide unit-of-measure conversions, manageable from the IT admin portal.",
  };
}

export default async function AdminItUomPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures system:c. IT admins have system:c|u|d.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const sysC = appMeta.domains?.system?.includes("c") ?? false;
  const sysD = appMeta.domains?.system?.includes("d") ?? false;
  const canWrite = sysC;
  const canDelete = sysD;

  const data = await getUomConversionsPage(supabase);
  return (
    <UomConversionsPage data={data} canWrite={canWrite} canDelete={canDelete} />
  );
}

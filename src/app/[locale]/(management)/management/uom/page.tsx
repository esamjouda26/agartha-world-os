import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUomConversionsPage } from "@/features/procurement/queries/get-uom-conversions-page";
import { UomConversionsPage } from "@/components/shared/uom-conversions-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "UOM Conversions",
    description:
      "Unit-of-measure conversions used by procurement, inventory, and POS catalogs.",
  };
}

export default async function ManagementUomPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures procurement:c | pos:c | system:c.
  // Page-level fine-grained checks for write + delete:
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const procC = appMeta.domains?.procurement?.includes("c") ?? false;
  const sysC = appMeta.domains?.system?.includes("c") ?? false;
  const procD = appMeta.domains?.procurement?.includes("d") ?? false;
  const sysD = appMeta.domains?.system?.includes("d") ?? false;
  // RLS allows write/delete for system OR procurement (per init_schema §7c);
  // pos managers see the page but cannot mutate uom_conversions.
  const canWrite = procC || sysC;
  const canDelete = procD || sysD;

  const data = await getUomConversionsPage(supabase);
  return (
    <UomConversionsPage data={data} canWrite={canWrite} canDelete={canDelete} />
  );
}

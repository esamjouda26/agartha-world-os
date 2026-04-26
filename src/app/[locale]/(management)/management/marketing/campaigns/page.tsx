import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCampaignsList } from "@/features/marketing/queries/get-campaigns-list";
import { CampaignsListView } from "@/features/marketing/components/campaigns-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Campaigns · Marketing",
    description: "Marketing campaigns and their linked promo codes.",
  };
}

export default async function ManagementMarketingCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware already gates `marketing:c`. Page-level capabilities just
  // light up the corresponding CTAs — RLS still enforces row-level access.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreate = appMeta.domains?.marketing?.includes("c") ?? false;
  const canUpdate = appMeta.domains?.marketing?.includes("u") ?? false;
  const canDelete = appMeta.domains?.marketing?.includes("d") ?? false;

  const data = await getCampaignsList(supabase);

  return (
    <CampaignsListView
      data={data}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}

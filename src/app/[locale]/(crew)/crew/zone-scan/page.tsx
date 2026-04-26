import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getZoneScanContext } from "@/features/operations/queries/get-zone-scan-context";
import { ZoneScanView } from "@/features/operations/components/zone-scan-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Zone Declaration", description: "Declare your current zone by scanning the QR code." };
}

export default async function CrewZoneScanPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const context = await getZoneScanContext(supabase, user.id);

  if (!context) {
    return (
      <div className="flex h-full flex-col" data-testid="zone-scan-page">
        <CrewPageHeader title="Zone Declaration" subtitle="Scan QR to declare your location" />
        <div className="flex-1 overflow-y-auto p-4">
          <EmptyStateCta
            variant="first-use"
            title="No staff record linked"
            description="Your account is not linked to a staff record. Contact HR."
            data-testid="zone-scan-no-record"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="zone-scan-page">
      <CrewPageHeader title="Zone Declaration" subtitle="Scan QR to declare your location" />
      <div className="flex-1 overflow-y-auto">
        <ZoneScanView initialContext={context} />
      </div>
    </div>
  );
}

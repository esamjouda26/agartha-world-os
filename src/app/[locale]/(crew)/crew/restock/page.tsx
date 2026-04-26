import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRestockContext } from "@/features/inventory/queries/get-restock-context";
import { RestockView } from "@/features/inventory/components/restock-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Restock Request",
    description: "Request materials to be delivered to your location.",
  };
}

export default async function CrewRestockPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const context = await getRestockContext(supabase, user.id);

  if (context.locations.length === 0) {
    return (
      <div className="flex h-full flex-col" data-testid="restock-page">
        <CrewPageHeader title="Restock Request" subtitle="Request materials for your location" />
        <div className="flex-1 overflow-y-auto p-4">
          <EmptyStateCta
            variant="first-use"
            title="No locations available"
            description="No delivery locations are set up. Contact your manager."
            data-testid="restock-no-locations"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="restock-page">
      <CrewPageHeader title="Restock Request" subtitle="Request materials for your location" />
      <div className="flex-1 overflow-y-auto">
        <RestockView context={context} />
      </div>
    </div>
  );
}

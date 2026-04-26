import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPosContext } from "@/features/pos/queries/get-pos-context";
import { PosTerminal } from "@/features/pos/components/pos-terminal";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "POS Terminal",
    description: "Place orders from the POS catalog for your location.",
  };
}

export default async function CrewPosPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Pattern C: RSC resolves all context; PosTerminal never fetches.
  const posContext = await getPosContext(supabase, user.id);

  if (!posContext) {
    return (
      <div className="flex h-full flex-col" data-testid="pos-terminal-page">
        <CrewPageHeader title="POS Terminal" subtitle="POS Terminal" />
        <div className="flex-1 overflow-y-auto p-4">
          <EmptyStateCta
            variant="first-use"
            title="No POS point assigned"
            description="Your work location has no POS terminal configured. Contact your manager."
            data-testid="pos-no-point-state"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="pos-terminal-page">
      <CrewPageHeader title={posContext.posPointName} subtitle="Place orders for your location" />
      <div className="flex-1 overflow-hidden">
        <PosTerminal posContext={posContext} />
      </div>
    </div>
  );
}

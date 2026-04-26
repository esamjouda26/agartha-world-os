import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisposalContext } from "@/features/inventory/queries/get-disposal-context";
import { DisposalForm } from "@/features/inventory/components/disposal-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Waste Declaration", description: "Log waste and disposal events." };
}

export default async function CrewDisposalsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const context = await getDisposalContext(supabase, user.id);

  return (
    <div className="flex h-full flex-col" data-testid="disposals-page">
      <CrewPageHeader title="Waste Declaration" subtitle="Record waste or disposal events" />
      <div className="flex-1 overflow-y-auto p-4">
        <DisposalForm context={context} />
      </div>
    </div>
  );
}

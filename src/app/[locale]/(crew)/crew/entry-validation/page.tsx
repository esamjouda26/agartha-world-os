import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EntryValidationView } from "@/features/booking/components/entry-validation-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Entry Validation",
    description: "Scan or look up guest bookings for check-in at the entry gate.",
  };
}

export default async function CrewEntryValidationPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  return (
    <div className="flex h-full flex-col" data-testid="entry-validation-page">
      <CrewPageHeader title="Entry Validation" subtitle="Scan QR code or search by ref / email" />
      <div className="flex-1 overflow-y-auto">
        <EntryValidationView />
      </div>
    </div>
  );
}

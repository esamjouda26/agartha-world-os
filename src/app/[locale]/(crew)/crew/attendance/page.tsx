import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal.crew");
  return { title: "Attendance", description: t("attendancePlaceholder") };
}

export default async function CrewAttendancePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const t = await getTranslations("portal.crew");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const name = profile?.display_name ?? user.email ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("welcome", { name })}
        description={t("attendancePlaceholder")}
        data-testid="crew-attendance-welcome"
      />
      <EmptyState
        variant="first-use"
        title="Attendance"
        description={t("attendancePlaceholder")}
        data-testid="crew-attendance-empty"
      />
    </div>
  );
}

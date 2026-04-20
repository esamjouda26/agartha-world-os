import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, FileText, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PortalWelcomeHero } from "@/components/shared/portal-welcome-hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal.admin");
  return { title: "System Dashboard", description: t("description") };
}

/**
 * `/admin/it` — the IT-persona landing page. Until Phase 6 ships real
 * system-health KPIs (devices online, incidents open, etc.) this is a
 * welcome hero + quick-action tiles targeting the most-visited
 * cross-portal surfaces.
 */
export default async function AdminITPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const t = await getTranslations("portal.admin");
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
    <PortalWelcomeHero
      eyebrow="IT Portal · System dashboard"
      name={name}
      description={t("description")}
      statusLabel="Live"
      quickActions={[
        {
          href: "/admin/attendance",
          label: "Attendance",
          description: "Review your punches, exceptions, and monthly pattern.",
          Icon: Clock,
        },
        {
          href: "/admin/reports",
          label: "Reports",
          description: "Generate compliance and operations reports across domains.",
          Icon: FileText,
        },
        {
          href: "/admin/settings",
          label: "Settings",
          description: "Adjust workspace preferences and notification defaults.",
          Icon: Settings,
        },
      ]}
      data-testid="admin-it-welcome"
    />
  );
}

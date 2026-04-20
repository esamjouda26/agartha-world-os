import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LineChart, Megaphone, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PortalWelcomeHero } from "@/components/shared/portal-welcome-hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal.admin");
  return { title: "Executive Dashboard", description: t("description") };
}

/**
 * `/admin/business` — the Business-persona landing page. Quick actions
 * point to the Business-side surfaces Phase 6 will flesh out (revenue,
 * guests, announcements).
 */
export default async function AdminBusinessPage({
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
      eyebrow="Business Portal · Executive dashboard"
      name={name}
      description={t("description")}
      statusLabel="Live"
      quickActions={[
        {
          href: "/admin/revenue",
          label: "Revenue",
          description: "Track bookings revenue, POS sales, and month-over-month trend.",
          Icon: LineChart,
        },
        {
          href: "/admin/guests",
          label: "Guests",
          description: "Guest-satisfaction, NPS trends, and response-rate surfaces.",
          Icon: Users,
        },
        {
          href: "/admin/announcements",
          label: "Announcements",
          description: "Broadcast updates to staff or guest-facing channels.",
          Icon: Megaphone,
        },
      ]}
      data-testid="admin-business-welcome"
    />
  );
}

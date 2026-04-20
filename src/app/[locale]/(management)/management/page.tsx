import type { Metadata } from "next";
import { Building2, Clock, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { redirect as i18nRedirect } from "@/i18n/navigation";
import { PortalWelcomeHero } from "@/components/shared/portal-welcome-hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterNavForUser, firstAccessiblePath } from "@/lib/nav/filter";
import type { AccessLevel } from "@/lib/rbac/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal.management");
  return { title: "Management", description: t("description") };
}

export default async function ManagementIndexPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const t = await getTranslations("portal.management");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    i18nRedirect({ href: "/auth/login", locale });
    return null;
  }

  const appMetadata = (user.app_metadata ?? {}) as {
    access_level?: AccessLevel;
    domains?: Record<string, readonly string[]>;
  };
  const accessLevel = appMetadata.access_level ?? "manager";
  const manifest = filterNavForUser("management", accessLevel, appMetadata.domains);
  // Landing picks the first domain section (not the shared fallback) so a
  // user with domain access actually lands on their primary workflow.
  const firstDomainRoute = firstAccessiblePath(manifest, { excludeSectionId: "shared" });
  if (firstDomainRoute) {
    i18nRedirect({ href: firstDomainRoute, locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const name = profile?.display_name ?? user.email ?? "";

  // Falls through only when the user has no domain section entries —
  // managers who haven't been assigned a domain yet or whose domains
  // were revoked. Keep the affordance consistent with the admin
  // welcome hero so the portal chrome feels like one system.
  return (
    <PortalWelcomeHero
      eyebrow={`Management Portal · ${t("noDomain")}`}
      name={name}
      description="No management domains assigned yet. HR will enable your domain access once your role is confirmed. In the meantime, these shared surfaces are available:"
      quickActions={[
        {
          href: "/management/attendance",
          label: "Attendance",
          description: "Clock in/out, review exceptions, check monthly stats.",
          Icon: Clock,
        },
        {
          href: "/management/staffing",
          label: "Today's staffing",
          description: "Who is on shift right now across your unit.",
          Icon: Building2,
        },
        {
          href: "/management/settings",
          label: "Settings",
          description: "Workspace preferences and notification defaults.",
          Icon: Settings,
        },
      ]}
      data-testid="management-no-domain"
    />
  );
}

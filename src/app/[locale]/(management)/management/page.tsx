import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { redirect as i18nRedirect } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MANAGEMENT_DOMAIN_SECTION, filterNavItems } from "@/lib/rbac/sidebar-config";

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
    domains?: Record<string, readonly string[]>;
  };
  const first = filterNavItems(MANAGEMENT_DOMAIN_SECTION.items, appMetadata.domains)[0];
  if (first) {
    i18nRedirect({ href: first.href, locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const name = profile?.display_name ?? user.email ?? "";

  return (
    <div className="space-y-6">
      <PageHeader title={t("welcome", { name })} description={t("description")} />
      <EmptyState variant="first-use" title={t("noDomain")} data-testid="management-no-domain" />
    </div>
  );
}

import type { Metadata } from "next";
import { AlertOctagon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StatusMessageCard } from "@/components/shared/status-message-card";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.accessRevoked");
  return { title: t("title"), description: t("description") };
}

/**
 * Access-revoked status screen. Rendered when middleware detects the
 * user's `employment_status` is `suspended` or `terminated`. Delegates
 * chrome to the shared `<StatusMessageCard>` so every account-state
 * screen in the app renders from one primitive.
 */
export default async function AccessRevokedPage() {
  const t = await getTranslations("auth.accessRevoked");
  return (
    <StatusMessageCard
      icon={AlertOctagon}
      tone="danger"
      badgeLabel="Access revoked"
      title={t("title")}
      description={t("description")}
      action={
        <Button asChild size="lg" className="w-full" data-testid="access-revoked-back">
          <Link href="/auth/login">{t("action")}</Link>
        </Button>
      }
      data-testid="access-revoked-page"
    />
  );
}

import type { Metadata } from "next";
import { Palmtree } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StatusMessageCard } from "@/components/shared/status-message-card";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.onLeave");
  return { title: t("title"), description: t("description") };
}

/**
 * On-leave status screen. Rendered when `employment_status` is
 * `on_leave` — the account exists and is valid, but write paths are
 * disabled until the staff member returns. Delegates chrome to
 * `<StatusMessageCard>`.
 */
export default async function OnLeavePage() {
  const t = await getTranslations("auth.onLeave");
  return (
    <StatusMessageCard
      icon={Palmtree}
      tone="info"
      badgeLabel="On leave"
      title={t("title")}
      description={t("description")}
      action={
        <Button asChild size="lg" className="w-full" data-testid="on-leave-continue">
          <Link href="/">{t("action")}</Link>
        </Button>
      }
      data-testid="on-leave-page"
    />
  );
}

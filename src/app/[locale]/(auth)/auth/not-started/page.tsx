import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StatusMessageCard } from "@/components/shared/status-message-card";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.notStarted");
  return { title: t("title"), description: t("description") };
}

/**
 * Not-started status screen. Rendered when `employment_status` is
 * `pending` — account exists but the staff member's start date is in
 * the future. Delegates chrome to `<StatusMessageCard>`.
 */
export default async function NotStartedPage() {
  const t = await getTranslations("auth.notStarted");
  return (
    <StatusMessageCard
      icon={CalendarClock}
      tone="warning"
      badgeLabel="Account pending"
      title={t("title")}
      description={t("description")}
      action={
        <Button asChild size="lg" className="w-full" data-testid="not-started-back">
          <Link href="/auth/login">{t("action")}</Link>
        </Button>
      }
      data-testid="not-started-page"
    />
  );
}

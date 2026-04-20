import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
 * the future. Warning-tone glass badge signals "wait, don't retry".
 */
export default async function NotStartedPage() {
  const t = await getTranslations("auth.notStarted");
  return (
    <div className="flex flex-col items-center gap-5 text-center" data-testid="not-started-page">
      <div
        aria-hidden
        className="bg-status-warning-soft text-status-warning-foreground ring-status-warning-border flex size-14 items-center justify-center rounded-2xl ring-1"
      >
        <CalendarClock className="size-7" strokeWidth={2} />
      </div>
      <StatusBadge status="pending" tone="warning" variant="glass" label="Account pending" />
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
          {t("title")}
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">{t("description")}</p>
      </div>
      <Button asChild size="lg" className="w-full" data-testid="not-started-back">
        <Link href="/auth/login">{t("action")}</Link>
      </Button>
    </div>
  );
}

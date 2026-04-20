import type { Metadata } from "next";
import { Palmtree } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
 * disabled until the staff member returns. Info-tone glass badge
 * signals "expected state, not an error".
 */
export default async function OnLeavePage() {
  const t = await getTranslations("auth.onLeave");
  return (
    <div className="flex flex-col items-center gap-5 text-center" data-testid="on-leave-page">
      <div
        aria-hidden
        className="bg-status-info-soft text-status-info-foreground ring-status-info-border flex size-14 items-center justify-center rounded-2xl ring-1"
      >
        <Palmtree className="size-7" strokeWidth={2} />
      </div>
      <StatusBadge status="on_leave" tone="info" variant="glass" label="On leave" />
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
          {t("title")}
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">{t("description")}</p>
      </div>
      <Button asChild size="lg" className="w-full" data-testid="on-leave-continue">
        <Link href="/">{t("action")}</Link>
      </Button>
    </div>
  );
}

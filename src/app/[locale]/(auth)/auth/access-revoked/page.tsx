import type { Metadata } from "next";
import { AlertOctagon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.accessRevoked");
  return { title: t("title"), description: t("description") };
}

/**
 * Access-revoked status screen. Rendered when middleware detects the
 * user's `employment_status` is `suspended` or `terminated`. Danger-tone
 * glass badge makes the severity unmistakable; the copy stays calm and
 * directs the user to contact HR rather than retry.
 */
export default async function AccessRevokedPage() {
  const t = await getTranslations("auth.accessRevoked");
  return (
    <div className="flex flex-col items-center gap-5 text-center" data-testid="access-revoked-page">
      <div
        aria-hidden
        className="bg-status-danger-soft text-status-danger-foreground ring-status-danger-border flex size-14 items-center justify-center rounded-2xl ring-1"
      >
        <AlertOctagon className="size-7" strokeWidth={2} />
      </div>
      <StatusBadge status="revoked" tone="danger" variant="glass" label="Access revoked" />
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
          {t("title")}
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">{t("description")}</p>
      </div>
      <Button asChild size="lg" className="w-full" data-testid="access-revoked-back">
        <Link href="/auth/login">{t("action")}</Link>
      </Button>
    </div>
  );
}

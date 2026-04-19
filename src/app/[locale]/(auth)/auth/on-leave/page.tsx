import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.onLeave");
  return { title: t("title"), description: t("description") };
}

export default async function OnLeavePage() {
  const t = await getTranslations("auth.onLeave");
  return (
    <EmptyState
      variant="first-use"
      title={t("title")}
      description={t("description")}
      data-testid="on-leave-page"
      action={
        <Button asChild data-testid="on-leave-continue">
          <Link href="/">{t("action")}</Link>
        </Button>
      }
    />
  );
}

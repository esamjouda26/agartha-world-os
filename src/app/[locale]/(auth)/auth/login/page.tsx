import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title"), description: t("description") };
}

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const t = await getTranslations("auth.login");
  const { next } = await searchParams;

  return (
    <div className="space-y-6" data-testid="login-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-foreground-muted text-sm">{t("description")}</p>
      </header>
      <LoginForm nextPath={next} />
    </div>
  );
}

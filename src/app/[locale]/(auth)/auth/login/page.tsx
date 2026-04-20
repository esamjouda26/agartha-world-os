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
    <div className="space-y-7" data-testid="login-page">
      <header className="space-y-2">
        <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
          Sign in
        </p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
          {t("title")}
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">{t("description")}</p>
      </header>
      <LoginForm {...(next ? { nextPath: next } : {})} />
    </div>
  );
}

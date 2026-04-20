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
  const { next } = await searchParams;

  return (
    <div className="space-y-7" data-testid="login-page">
      <header className="space-y-2">
        <h1 className="text-foreground text-[28px] font-semibold tracking-tight sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">
          Use your staff credentials to continue. Access is limited to registered AgarthaOS
          workspace members.
        </p>
      </header>
      <LoginForm {...(next ? { nextPath: next } : {})} />
      <footer className="border-border-subtle border-t pt-5">
        <p className="text-foreground-subtle text-xs leading-relaxed">
          Trouble signing in? Your manager or HR can reset your access — AgarthaOS doesn&apos;t send
          self-service password emails on purpose.
        </p>
      </footer>
    </div>
  );
}

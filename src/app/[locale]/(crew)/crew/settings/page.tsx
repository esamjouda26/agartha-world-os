import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPage } from "@/components/shared/settings-page";
import { resolveSettingsUser } from "@/features/settings/queries/resolve-settings-user";

/**
 * `/crew/settings` — Pattern C route wrapper (ADR-0007).
 * Resolves the authenticated user server-side, then injects the
 * resolved context as explicit props into `<SettingsPage>`.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your profile, avatar, and appearance preferences.",
};

export default async function CrewSettingsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  try {
    const user = await resolveSettingsUser();
    return <SettingsPage user={user} />;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      redirect(`/${locale}/auth/login`);
    }
    throw err;
  }
}

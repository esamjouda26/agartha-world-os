import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AnnouncementsBell } from "@/components/shared/announcements-bell";
import { PortalProviders } from "@/components/shared/portal-providers";
import { ShellWithPalette } from "@/components/shared/shell-with-palette";
import { listVisibleAnnouncements } from "@/features/announcements/queries/list-visible";
import { resolveUnreadAnnouncementCount } from "@/features/announcements/queries/unread-count";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gateEmploymentStatus } from "@/lib/auth/gate-employment-status";
import { filterNavForUser } from "@/lib/nav/filter";
import type { AccessLevel } from "@/lib/rbac/types";

export default async function CrewLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  await gateEmploymentStatus(user.id, locale);

  const appMetadata = (user.app_metadata ?? {}) as {
    access_level?: AccessLevel;
    domains?: Record<string, readonly string[]>;
  };
  const accessLevel = appMetadata.access_level ?? "crew";
  const navigation = filterNavForUser("crew", accessLevel, appMetadata.domains);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("SIDEBAR_COLLAPSED")?.value === "1";

  // Pattern C: resolve bell state server-side + inject via the shell's
  // notifications slot. The bell itself never fetches. See ADR-0007.
  const [unreadCount, announcements] = await Promise.all([
    resolveUnreadAnnouncementCount(),
    listVisibleAnnouncements(false),
  ]);

  return (
    <PortalProviders>
      <ShellWithPalette
        navigation={navigation}
        initialSidebarCollapsed={initialCollapsed}
        notifications={
          <AnnouncementsBell unreadCount={unreadCount} announcements={announcements} />
        }
      >
        {children}
      </ShellWithPalette>
    </PortalProviders>
  );
}

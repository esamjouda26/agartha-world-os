import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AnnouncementsBell } from "@/components/shared/announcements-bell";
import { PortalProviders } from "@/components/shared/portal-providers";
import { ShellWithPalette } from "@/components/shared/shell-with-palette";
import { ShellUserMenu } from "@/components/shared/shell-user-menu";
import { listVisibleAnnouncements } from "@/features/announcements/queries/list-visible";
import { resolveUnreadAnnouncementCount } from "@/features/announcements/queries/unread-count";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gateEmploymentStatus } from "@/lib/auth/gate-employment-status";
import { getShellUserInfo } from "@/lib/auth/get-shell-user-info";
import { filterNavForUser } from "@/lib/nav/filter";
import type { AccessLevel } from "@/lib/rbac/types";

export default async function AdminLayout({
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
  const accessLevel = appMetadata.access_level ?? "admin";
  const navigation = filterNavForUser("admin", accessLevel, appMetadata.domains);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("SIDEBAR_COLLAPSED")?.value === "1";

  // Pattern C: resolve bell state + user identity server-side.
  const [unreadCount, announcements, userInfo] = await Promise.all([
    resolveUnreadAnnouncementCount(),
    listVisibleAnnouncements(false),
    getShellUserInfo(supabase, user.id, accessLevel),
  ]);

  return (
    <PortalProviders>
      <ShellWithPalette
        navigation={navigation}
        initialSidebarCollapsed={initialCollapsed}
        userInfo={userInfo}
        notifications={
          <AnnouncementsBell unreadCount={unreadCount} announcements={announcements} />
        }
        userMenu={<ShellUserMenu userInfo={userInfo} settingsPath="/admin/settings" />}
      >
        {children}
      </ShellWithPalette>
    </PortalProviders>
  );
}

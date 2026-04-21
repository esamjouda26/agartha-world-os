import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PortalProviders } from "@/components/shared/portal-providers";
import { ShellWithPalette } from "@/components/shared/shell-with-palette";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const appMetadata = (user.app_metadata ?? {}) as {
    access_level?: AccessLevel;
    domains?: Record<string, readonly string[]>;
  };
  const accessLevel = appMetadata.access_level ?? "admin";
  const navigation = filterNavForUser("admin", accessLevel, appMetadata.domains);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("SIDEBAR_COLLAPSED")?.value === "1";

  return (
    <PortalProviders>
      <ShellWithPalette navigation={navigation} initialSidebarCollapsed={initialCollapsed}>
        {children}
      </ShellWithPalette>
    </PortalProviders>
  );
}

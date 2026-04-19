import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ShellWithPalette } from "@/components/shells/shell-with-palette";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { managementNavManifest } from "@/lib/rbac/navigation";

export default async function ManagementLayout({
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
    domains?: Record<string, readonly string[]>;
  };
  const navigation = managementNavManifest(appMetadata.domains);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("SIDEBAR_COLLAPSED")?.value === "1";

  return (
    <ShellWithPalette navigation={navigation} initialSidebarCollapsed={initialCollapsed}>
      {children}
    </ShellWithPalette>
  );
}

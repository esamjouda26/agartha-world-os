import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Root of a given locale — if authenticated, route to the correct portal
// using the 8a/8b/8c sidebar config; otherwise, punt to login.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AccessLevel = "admin" | "manager" | "crew";

function portalRoot(level: AccessLevel | undefined): string {
  switch (level) {
    case "admin":
      return "/admin/it";
    case "manager":
      return "/management";
    case "crew":
      return "/crew/attendance";
    default:
      return "/auth/login";
  }
}

export default async function LocaleRootPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accessLevel = (user?.app_metadata as { access_level?: AccessLevel } | undefined)
    ?.access_level;
  redirect(`/${locale}${portalRoot(accessLevel)}`);
}

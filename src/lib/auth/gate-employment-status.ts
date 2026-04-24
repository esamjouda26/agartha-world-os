import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Employment-status route gate per WF-0.
 *
 * Queries the profile's `employment_status` and `password_set` flags.
 * Redirects to the appropriate auth status screen if the user is not
 * in a state that permits portal access.
 *
 * Must be called from an RSC (server component) — typically a portal
 * layout — after confirming the user is authenticated.
 *
 * Redirect priority:
 *   1. password_set = false       → /auth/set-password
 *   2. pending                    → /auth/not-started
 *   3. on_leave                   → /auth/on-leave
 *   4. suspended / terminated     → /auth/access-revoked
 *   5. active                     → (no redirect, returns normally)
 */
export async function gateEmploymentStatus(userId: string, locale: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("password_set, employment_status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return; // No profile = let other guards handle it

  // 1. Force password set
  if (profile.password_set === false) {
    redirect(`/${locale}/auth/set-password`);
  }

  // 2-4. Employment status gate
  const statusRoute: Record<string, string> = {
    pending: "/auth/not-started",
    on_leave: "/auth/on-leave",
    suspended: "/auth/access-revoked",
    terminated: "/auth/access-revoked",
  };

  const status = profile.employment_status ?? "active";
  const route = statusRoute[status];
  if (route) {
    redirect(`/${locale}${route}`);
  }
}

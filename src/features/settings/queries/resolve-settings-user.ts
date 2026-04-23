import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Shape consumed by `<SettingsPage>` (spec §6 · SettingsPage / line 3787).
 * Serialisable across the RSC → Client boundary (no Dates, no Maps).
 */
export type SettingsUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  employeeId: string | null;
}>;

/**
 * Resolve the authenticated user's settings context for the shared
 * `<SettingsPage>` component (Pattern C — the wrapper reads JWT; the
 * shared component never touches auth).
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * `profiles` reads are RLS-scoped; Next's `unstable_cache` work fn runs
 * detached from request context (no `cookies()`), which would force a
 * service-role client that bypasses RLS — unacceptable per CLAUDE.md §2.
 *
 * Throws `UNAUTHENTICATED` when no user is in the session — the wrapper
 * is expected to redirect before calling this. Throws on the Supabase
 * error rather than swallowing it so `error.tsx` can surface it.
 */
export const resolveSettingsUser = cache(async (): Promise<SettingsUser> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  // Named projection only — prompt.md Absolute Rule #21 forbids `select('*')`.
  // `.single()` — `profiles.id` is the PK aliased to `auth.users.id`; exactly
  // one row is guaranteed for any authenticated user (the init_schema trigger
  // creates the row at signup).
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, email, employee_id")
    .eq("id", user.id)
    .single();
  if (error) throw error;

  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    displayName: profile.display_name ?? "",
    avatarUrl: profile.avatar_url,
    employeeId: profile.employee_id,
  };
});

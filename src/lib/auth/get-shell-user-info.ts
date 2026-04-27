"use server";

import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { AccessLevel } from "@/lib/rbac/types";

/**
 * Minimal identity payload for the portal shell chrome.
 * Rendered in the sidebar footer card + topbar user menu.
 */
export type ShellUserInfo = Readonly<{
  displayName: string;
  avatarUrl: string | null;
  roleName: string | null;
  orgUnitName: string | null;
  employeeId: string | null;
  accessLevel: AccessLevel;
}>;

/**
 * RSC query — lightweight profile join for the shell chrome.
 *
 * Path: `profiles` → `roles.display_name` (via `role_id`)
 *       `profiles` → `staff_records.org_unit_id` → `org_units.name`
 *
 * Cache model: `React.cache()` — request-scoped dedup only.
 */
export const getShellUserInfo = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
    accessLevel: AccessLevel,
  ): Promise<ShellUserInfo> => {
    const { data: profile } = await client
      .from("profiles")
      .select(
        `
        display_name,
        avatar_url,
        employee_id,
        roles ( display_name ),
        staff_records ( org_units ( name ) )
      `,
      )
      .eq("id", userId)
      .maybeSingle();

    const roleName = (profile?.roles as { display_name: string } | null)?.display_name ?? null;

    const staffRecord = profile?.staff_records as { org_units: { name: string } | null } | null;
    const orgUnitName = staffRecord?.org_units?.name ?? null;

    return {
      displayName: profile?.display_name ?? "User",
      avatarUrl: profile?.avatar_url ?? null,
      roleName,
      orgUnitName,
      employeeId: profile?.employee_id ?? null,
      accessLevel,
    };
  },
);

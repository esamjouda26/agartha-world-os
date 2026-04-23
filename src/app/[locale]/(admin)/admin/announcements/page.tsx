import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnnouncementsPage } from "@/components/shared/announcements-page";
import { listManageableAnnouncements } from "@/features/announcements/queries/list-manageable";
import {
  listOrgUnitOptions,
  listRoleOptions,
  listStaffOptions,
} from "@/features/announcements/queries/target-picker-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/admin/announcements` — Pattern C route wrapper.
 *
 * Resolves server-side:
 *   - `auth.uid()` for row-ownership scoping
 *   - `system:r` → `canManageAll` (admins see every announcement;
 *      managers see only their own)
 *   - `comms:d` → `canDelete`
 *   - Target-picker lookups (roles / org_units / staff)
 *
 * Middleware Gate 5 on `/admin/announcements` already enforces
 * `comms:c` before this RSC runs (see `src/features/announcements/rbac.ts`).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Announcements · Admin",
  description: "Create and manage organisation-wide announcements.",
};

export default async function AdminAnnouncementsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const commsAccess = appMeta.domains?.comms ?? [];
  const systemAccess = appMeta.domains?.system ?? [];
  const canManageAll = systemAccess.includes("r");
  const canDelete = commsAccess.includes("d");

  const [announcements, roles, orgUnits, staff] = await Promise.all([
    listManageableAnnouncements({ userId: user.id, hasSystemRead: canManageAll }),
    listRoleOptions(),
    listOrgUnitOptions(),
    listStaffOptions(),
  ]);

  return (
    <AnnouncementsPage
      announcements={announcements}
      roles={roles}
      orgUnits={orgUnits}
      staff={staff}
      canDelete={canDelete}
      canManageAll={canManageAll}
    />
  );
}

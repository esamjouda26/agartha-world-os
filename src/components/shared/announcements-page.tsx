import { PageHeader } from "@/components/ui/page-header";

import { AnnouncementsManagerView } from "@/features/announcements/components/announcements-manager-view";
import type { ManageableAnnouncement } from "@/features/announcements/queries/list-manageable";
import type {
  OrgUnitOption,
  RoleOption,
  StaffOption,
} from "@/features/announcements/queries/target-picker-options";

/**
 * Shared `AnnouncementsPage` — Universal Pattern C
 * ([ADR-0007](../../../docs/adr/0007-universal-pattern-c.md)).
 *
 * Manager/admin surface only. Crew do not get a sidebar route for
 * announcements — they read via the topbar bell (`<AnnouncementsBell />`)
 * which the portal layouts inject into the shell's `notifications` slot.
 *
 * The shared component never reads the JWT. The route wrapper resolves:
 *   - `announcements` (own or all, depending on `canManageAll`)
 *   - Role / org-unit / profile lookups for the target picker
 *   - `canManageAll` from JWT `system:r` (admins see all rows)
 *   - `canDelete` from JWT `comms:d`
 */

export interface AnnouncementsPageProps {
  announcements: readonly ManageableAnnouncement[];
  roles: readonly RoleOption[];
  orgUnits: readonly OrgUnitOption[];
  staff: readonly StaffOption[];
  canDelete: boolean;
  canManageAll: boolean;
}

export function AnnouncementsPage({
  announcements,
  roles,
  orgUnits,
  staff,
  canDelete,
  canManageAll,
}: Readonly<AnnouncementsPageProps>) {
  return (
    <div className="flex flex-col gap-6" data-testid="announcements-page">
      <PageHeader
        eyebrow="Communications"
        title="Announcements"
        description={
          canManageAll
            ? "Author announcements and oversee every active and draft notice across the organisation."
            : "Author announcements and manage the notices you've published."
        }
        data-testid="announcements-page-header"
      />
      <AnnouncementsManagerView
        announcements={announcements}
        roles={roles}
        orgUnits={orgUnits}
        staff={staff}
        canDelete={canDelete}
      />
    </div>
  );
}

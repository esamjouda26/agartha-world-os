"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

import { AnnouncementForm } from "@/features/announcements/components/announcement-form";
import { AnnouncementListItem } from "@/features/announcements/components/announcement-list-item";
import type { ManageableAnnouncement } from "@/features/announcements/queries/list-manageable";
import type {
  OrgUnitOption,
  RoleOption,
  StaffOption,
} from "@/features/announcements/queries/target-picker-options";

export type AnnouncementsManagerViewProps = Readonly<{
  announcements: readonly ManageableAnnouncement[];
  roles: readonly RoleOption[];
  orgUnits: readonly OrgUnitOption[];
  staff: readonly StaffOption[];
  /** `true` iff the user has `comms:d`. Hides the delete button when false. */
  canDelete: boolean;
}>;

const VIEW_MODES = ["published", "drafts"] as const;

/**
 * Client leaf for the management route. Two orthogonal states:
 *   - `?status=published|drafts` — list filter (nuqs-driven).
 *   - `mode` local state — "list" (default) | "create" | "edit-<id>".
 *
 * Keeping `mode` in local state (not nuqs) is deliberate: switching
 * between list and create/edit is a transient UI journey, not a
 * shareable/deep-linkable URL per spec conventions. The list filter
 * IS deep-linkable (admins copy-paste "here are my drafts" links).
 */
export function AnnouncementsManagerView({
  announcements,
  roles,
  orgUnits,
  staff,
  canDelete,
}: AnnouncementsManagerViewProps) {
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringEnum([...VIEW_MODES]).withDefault("published"),
  );
  const [mode, setMode] = React.useState<"list" | "create" | { kind: "edit"; id: string }>("list");

  const { publishedCount, draftsCount } = React.useMemo(() => {
    let p = 0;
    let d = 0;
    for (const a of announcements) {
      if (a.isPublished) p++;
      else d++;
    }
    return { publishedCount: p, draftsCount: d };
  }, [announcements]);

  const visible = React.useMemo(
    () => announcements.filter((a) => (status === "published" ? a.isPublished : !a.isPublished)),
    [announcements, status],
  );

  const editingAnnouncement = React.useMemo(() => {
    if (typeof mode === "string") return null;
    return announcements.find((a) => a.id === mode.id) ?? null;
  }, [announcements, mode]);

  // Target lookups — derived once for the form and the list badges.
  const { roleNameById, orgUnitNameById, staffNameById } = React.useMemo(() => {
    const r = new Map<string, string>();
    for (const row of roles) r.set(row.id, row.displayName);
    const o = new Map<string, string>();
    for (const row of orgUnits) o.set(row.id, row.name);
    const s = new Map<string, string>();
    for (const row of staff) s.set(row.id, row.displayName || row.email || row.id);
    return { roleNameById: r, orgUnitNameById: o, staffNameById: s };
  }, [roles, orgUnits, staff]);

  const goBackToList = React.useCallback(() => setMode("list"), []);

  if (mode === "create") {
    return (
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goBackToList}
          data-testid="announcements-cancel-create"
        >
          ← Back to list
        </Button>
        <AnnouncementForm
          roles={roles}
          orgUnits={orgUnits}
          staff={staff}
          onComplete={goBackToList}
        />
      </div>
    );
  }

  if (typeof mode === "object" && editingAnnouncement) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goBackToList}
          data-testid="announcements-cancel-edit"
        >
          ← Back to list
        </Button>
        <AnnouncementForm
          initial={{
            id: editingAnnouncement.id,
            title: editingAnnouncement.title,
            content: editingAnnouncement.content,
            isPublished: editingAnnouncement.isPublished,
            expiresAt: editingAnnouncement.expiresAt,
            targets: editingAnnouncement.targets.map((t) => {
              switch (t.targetType) {
                case "global":
                  return { target_type: "global" };
                case "role":
                  return { target_type: "role", role_id: t.roleId };
                case "org_unit":
                  return { target_type: "org_unit", org_unit_id: t.orgUnitId };
                case "user":
                  return { target_type: "user", user_id: t.userId };
              }
            }),
          }}
          roles={roles}
          orgUnits={orgUnits}
          staff={staff}
          onComplete={goBackToList}
        />
      </div>
    );
  }

  // If the user clicked Edit for a row that was then deleted in a
  // concurrent session, fall back to the list.
  if (typeof mode === "object" && !editingAnnouncement) {
    setMode("list");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabBar
          ariaLabel="Announcement status filter"
          defaultValue="published"
          paramKey="status"
          tabs={[
            { value: "published", label: "Published", count: publishedCount },
            { value: "drafts", label: "Drafts", count: draftsCount },
          ]}
          data-testid="announcements-status-tabs"
        />
        <Button
          type="button"
          onClick={() => setMode("create")}
          data-testid="announcements-create-trigger"
        >
          <Plus aria-hidden className="size-4" />
          <span>New announcement</span>
        </Button>
      </div>

      {visible.length === 0 ? (
        announcements.length === 0 ? (
          <EmptyStateCta
            variant="first-use"
            title="No announcements yet"
            description="Create your first announcement to let the right audience know what's changing."
            ctaLabel="Create announcement"
            onClick={() => setMode("create")}
            data-testid="announcements-empty-first-use"
          />
        ) : (
          <EmptyStateCta
            variant="filtered-out"
            title={status === "published" ? "No published announcements" : "No drafts"}
            description={
              status === "published"
                ? "Switch to Drafts to see your in-progress items, or create a new announcement."
                : "Everything you've authored is already published. Create a new one to start a draft."
            }
            data-testid="announcements-empty-filtered"
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((a) => (
            <AnnouncementListItem
              key={a.id}
              announcement={a}
              roleNameById={roleNameById}
              orgUnitNameById={orgUnitNameById}
              staffNameById={staffNameById}
              onEdit={(id) => setMode({ kind: "edit", id })}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

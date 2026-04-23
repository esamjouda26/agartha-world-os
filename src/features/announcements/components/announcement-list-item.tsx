"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Edit3, Globe2, Trash2, Users, User, Building2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { deleteAnnouncementAction } from "@/features/announcements/actions/delete-announcement";
import type { ManageableAnnouncement } from "@/features/announcements/queries/list-manageable";

export type AnnouncementListItemProps = Readonly<{
  announcement: ManageableAnnouncement;
  roleNameById: ReadonlyMap<string, string>;
  orgUnitNameById: ReadonlyMap<string, string>;
  staffNameById: ReadonlyMap<string, string>;
  onEdit: (id: string) => void;
  canDelete: boolean;
}>;

/**
 * One row in the manager's list — title / content preview / targets /
 * status, with Edit + Delete actions. Delete is behind an AlertDialog
 * confirmation because it CASCADE-deletes targets + read receipts.
 */
export function AnnouncementListItem({
  announcement,
  roleNameById,
  orgUnitNameById,
  staffNameById,
  onEdit,
  canDelete,
}: AnnouncementListItemProps) {
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteAnnouncementAction({ id: announcement.id });
      if (result.success) {
        toastSuccess("Announcement deleted");
        setOpen(false);
      } else {
        toastError(result);
      }
    });
  };

  return (
    <Card data-testid={`announcement-list-item-${announcement.id}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-base">{announcement.title}</CardTitle>
            <CardDescription className="text-xs">
              {announcement.createdByName || "Unknown author"} ·{" "}
              {format(parseISO(announcement.createdAt), "MMM d, yyyy")}
              {announcement.expiresAt
                ? ` · expires ${format(parseISO(announcement.expiresAt), "MMM d, yyyy")}`
                : ""}
            </CardDescription>
          </div>
          <StatusBadge
            status={announcement.isPublished ? "active" : "draft"}
            label={announcement.isPublished ? "Published" : "Draft"}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-foreground-muted line-clamp-3 text-sm whitespace-pre-wrap">
          {announcement.content}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {announcement.targets.map((t, i) => (
            <TargetBadge
              key={i}
              target={t}
              roleNameById={roleNameById}
              orgUnitNameById={orgUnitNameById}
              staffNameById={staffNameById}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(announcement.id)}
            data-testid={`announcement-list-item-${announcement.id}-edit`}
          >
            <Edit3 aria-hidden className="size-4" />
            <span>Edit</span>
          </Button>

          {canDelete ? (
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-status-danger-foreground hover:text-status-danger-foreground"
                  data-testid={`announcement-list-item-${announcement.id}-delete`}
                >
                  <Trash2 aria-hidden className="size-4" />
                  <span>Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the announcement, its target list, and everyone&apos;s read
                    receipts. It cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    data-testid={`announcement-list-item-${announcement.id}-delete-confirm`}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TargetBadge({
  target,
  roleNameById,
  orgUnitNameById,
  staffNameById,
}: Readonly<{
  target: ManageableAnnouncement["targets"][number];
  roleNameById: ReadonlyMap<string, string>;
  orgUnitNameById: ReadonlyMap<string, string>;
  staffNameById: ReadonlyMap<string, string>;
}>) {
  switch (target.targetType) {
    case "global":
      return (
        <Badge variant="secondary" className="gap-1">
          <Globe2 aria-hidden className="size-3" />
          <span>Everyone</span>
        </Badge>
      );
    case "role":
      return (
        <Badge variant="secondary" className="gap-1">
          <Users aria-hidden className="size-3" />
          <span>{roleNameById.get(target.roleId) ?? "Role"}</span>
        </Badge>
      );
    case "org_unit":
      return (
        <Badge variant="secondary" className="gap-1">
          <Building2 aria-hidden className="size-3" />
          <span>{orgUnitNameById.get(target.orgUnitId) ?? "Org unit"}</span>
        </Badge>
      );
    case "user":
      return (
        <Badge variant="secondary" className="gap-1">
          <User aria-hidden className="size-3" />
          <span>{staffNameById.get(target.userId) ?? "User"}</span>
        </Badge>
      );
  }
}

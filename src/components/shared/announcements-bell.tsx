"use client";

import * as React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import { markAnnouncementAsReadAction } from "@/features/announcements/actions/mark-as-read";
import { markAllAnnouncementsAsReadAction } from "@/features/announcements/actions/mark-all-as-read";
import type { VisibleAnnouncement } from "@/features/announcements/queries/list-visible";

/**
 * Topbar announcements bell — Universal Pattern C.
 *
 * Pure client presentation surface. It NEVER fetches its own data — per
 * ADR-0007, identity-scoped data is resolved by the parent RSC (the
 * portal layouts: `(admin)/layout.tsx`, `(management)/layout.tsx`,
 * `(crew)/layout.tsx`) and injected here as props via the shell's
 * `notifications` slot.
 *
 * The bell itself invokes Server Actions (`markAnnouncementAsReadAction`,
 * `markAllAnnouncementsAsReadAction`) which invalidate the
 * `ANNOUNCEMENTS_ROUTER_PATHS` set so next navigation refreshes both
 * the badge count and the visible list.
 */

export interface AnnouncementsBellProps {
  /** Resolved via `rpc_get_unread_announcement_count()` in the RSC layout. */
  unreadCount: number;
  /** Resolved via `get_visible_announcements(p_unread_only := FALSE)`. */
  announcements: readonly VisibleAnnouncement[];
}

const BADGE_CAP = 99;

export function AnnouncementsBell({
  unreadCount,
  announcements,
}: Readonly<AnnouncementsBellProps>) {
  const [open, setOpen] = React.useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    React.useState<VisibleAnnouncement | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const displayCount = unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : String(unreadCount);
  const hasUnread = unreadCount > 0;

  const handleMarkOne = (announcementId: string) => {
    startTransition(async () => {
      const result = await markAnnouncementAsReadAction({ announcementId });
      if (!result.success) toastError(result);
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      const result = await markAllAnnouncementsAsReadAction();
      if (result.success) {
        toastSuccess(
          result.data.markedCount === 0
            ? "Already all caught up"
            : `Marked ${result.data.markedCount} as read`,
        );
      } else {
        toastError(result);
      }
    });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              hasUnread ? `Announcements — ${unreadCount} unread` : "Announcements — all caught up"
            }
            data-testid="announcements-bell-trigger"
            className="relative"
          >
            <Bell aria-hidden className="size-5" />
            {hasUnread ? (
              <span
                aria-hidden
                data-testid="announcements-bell-badge"
                className="bg-status-danger-solid text-primary-foreground absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-[18px] font-semibold"
              >
                {displayCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-96 max-w-[calc(100vw-2rem)] p-0"
          data-testid="announcements-bell-popover"
        >
          <div className="border-border-subtle flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-foreground text-sm font-semibold">Announcements</p>
              <p className="text-foreground-muted text-xs">
                {hasUnread ? `${unreadCount} unread` : "You're all caught up."}
              </p>
            </div>
            {hasUnread ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={isPending}
                data-testid="announcements-bell-mark-all"
              >
                <CheckCheck aria-hidden className="size-4" />
                <span>Mark all read</span>
              </Button>
            ) : null}
          </div>

          {announcements.length === 0 ? (
            <div className="px-4 py-8 text-center" data-testid="announcements-bell-empty">
              <p className="text-foreground-muted text-sm">
                No announcements have been shared with you yet.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <ul className="divide-border-subtle divide-y">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!a.isRead) handleMarkOne(a.id);
                        setSelectedAnnouncement(a);
                      }}
                      disabled={isPending}
                      className={cn(
                        "focus-visible:outline-ring hover:bg-surface/60 flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
                        !a.isRead && "bg-brand-primary/5",
                      )}
                      data-testid={`announcements-bell-item-${a.id}`}
                      aria-label={a.isRead ? a.title : `${a.title} — mark as read`}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                          a.isRead ? "bg-transparent" : "bg-brand-primary",
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p
                          className={cn(
                            "text-foreground text-sm",
                            a.isRead ? "font-normal" : "font-semibold",
                          )}
                        >
                          {a.title}
                        </p>
                        <p className="text-foreground-muted line-clamp-2 text-xs whitespace-pre-wrap">
                          {a.content}
                        </p>
                        <p className="text-foreground-subtle text-[11px]">
                          {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
                          {a.createdByName ? ` · ${a.createdByName}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      <Dialog
        open={!!selectedAnnouncement}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedAnnouncement(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
            <DialogDescription>
              {selectedAnnouncement?.createdByName
                ? `From ${selectedAnnouncement.createdByName} · `
                : ""}
              {selectedAnnouncement?.createdAt
                ? formatDistanceToNow(parseISO(selectedAnnouncement.createdAt), { addSuffix: true })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="text-foreground mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {selectedAnnouncement?.content}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

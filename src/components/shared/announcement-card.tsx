import * as React from "react";
import { Paperclip, Pin } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAtFacility } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

/**
 * AnnouncementCard — standard announcement presentation.
 *
 * Renders a single announcement with title, excerpt, posted-by actor,
 * relative timestamp, read/pinned state, and optional attachment
 * preview. Used in:
 *
 *   - `announcements-page.tsx` (feed body)
 *   - `announcements-bell.tsx` (compact dropdown list)
 *   - `/crew/*` and `/management/*` portal feed surfaces
 *
 * Pattern C: the RSC layout fetches announcements + attachment URLs
 * (signed, TTL ≤ 15 min per CLAUDE.md §11) and renders this card. The
 * card is pure presentation.
 *
 * Lives in `shared/` alongside its parent `announcements-page` because
 * the announcements domain is rendered across admin / management /
 * crew with the same chrome — the policy established by
 * [attendance-page.tsx](src/components/shared/attendance-page.tsx).
 */

export type AnnouncementActor = Readonly<{
  name: string;
  role?: string;
  avatarUrl?: string;
}>;

export type AnnouncementAttachment = Readonly<{
  id: string;
  label: string;
  /** Signed URL for download. */
  href: string;
  /** Optional MIME-based tag (pdf, xlsx). */
  kind?: string;
}>;

export type AnnouncementCardProps = Readonly<{
  title: React.ReactNode;
  body: React.ReactNode;
  postedBy: AnnouncementActor;
  /** ISO datetime string. Rendered via `formatAtFacility`. */
  postedAt: string;
  dateFormat?: string;
  /** Unread dot + `font-semibold` title when true. */
  unread?: boolean;
  pinned?: boolean;
  /** Audience / category tag (`staff`, `management`, `all`). */
  audience?: React.ReactNode;
  /** Optional status tag — e.g. "Expired", "Draft". */
  statusLabel?: string;
  statusTone?: StatusTone;
  attachments?: readonly AnnouncementAttachment[];
  /** Fires when the card itself is clicked. Use to open the full view. */
  onOpen?: () => void;
  density?: "default" | "compact";
  className?: string;
  "data-testid"?: string;
}>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function AnnouncementCard({
  title,
  body,
  postedBy,
  postedAt,
  dateFormat = "PPp",
  unread = false,
  pinned = false,
  audience,
  statusLabel,
  statusTone,
  attachments,
  onOpen,
  density = "default",
  className,
  "data-testid": testId,
}: AnnouncementCardProps) {
  const Tag = onOpen ? "button" : "article";
  const interactive = Boolean(onOpen);

  return (
    <Tag
      {...(interactive ? { type: "button", onClick: onOpen } : {})}
      data-slot="announcement-card"
      data-unread={unread || undefined}
      data-pinned={pinned || undefined}
      data-testid={testId}
      className={cn(
        "border-border-subtle bg-card group/announcement relative flex w-full flex-col gap-3 rounded-xl border p-4 text-left shadow-xs",
        density === "compact" ? "gap-2 p-3" : null,
        interactive
          ? "hover:border-brand-primary/30 focus-visible:outline-ring cursor-pointer transition-[border-color,box-shadow] duration-[var(--duration-micro)] outline-none hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
          : null,
        unread ? "border-brand-primary/30" : null,
        className,
      )}
    >
      {unread ? (
        <span
          aria-label="Unread"
          className="bg-brand-primary absolute top-3 right-3 inline-block size-2 rounded-full"
        />
      ) : null}
      <header className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          {postedBy.avatarUrl ? <AvatarImage src={postedBy.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(postedBy.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3
              className={cn(
                "text-foreground text-sm leading-tight tracking-tight",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {title}
            </h3>
            {pinned ? (
              <span className="text-brand-primary inline-flex items-center gap-1 text-[11px] font-medium">
                <Pin aria-hidden className="size-3" /> Pinned
              </span>
            ) : null}
          </div>
          <div className="text-foreground-subtle flex flex-wrap items-center gap-2 text-xs">
            <span className="text-foreground font-medium">{postedBy.name}</span>
            {postedBy.role ? <span>· {postedBy.role}</span> : null}
            <span aria-hidden>·</span>
            <time>{formatAtFacility(postedAt, dateFormat)}</time>
            {audience ? (
              <span className="border-border-subtle rounded-full border px-1.5">{audience}</span>
            ) : null}
            {statusLabel && statusTone ? (
              <StatusBadge
                status={statusLabel.toLowerCase()}
                tone={statusTone}
                label={statusLabel}
              />
            ) : null}
          </div>
        </div>
      </header>
      <div className="text-foreground-muted text-sm leading-relaxed">{body}</div>
      {attachments && attachments.length > 0 ? (
        <footer className="border-border-subtle flex flex-wrap items-center gap-2 border-t pt-3">
          <Paperclip aria-hidden className="text-foreground-subtle size-3.5" />
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.href}
              download
              onClick={(event) => event.stopPropagation()}
              className="border-border-subtle hover:border-brand-primary/40 hover:text-brand-primary text-foreground bg-surface/60 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors"
            >
              <span className="max-w-[12rem] truncate">{attachment.label}</span>
              {attachment.kind ? (
                <span className="text-foreground-subtle uppercase">{attachment.kind}</span>
              ) : null}
            </a>
          ))}
        </footer>
      ) : null}
    </Tag>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

/**
 * AuditLogRow — generic timestamped actor/action row.
 *
 * Cross-domain building block for every audit surface — attendance
 * exceptions, incident chronology, role-permission changes, RLS policy
 * events. The row is domain-agnostic: it accepts an actor, an action
 * label, an optional entity reference, a timestamp, and a details slot.
 *
 * Used by [domain-audit-table.tsx](src/components/shared/domain-audit-table.tsx)
 * (existing shared component) and by any list view rendering a sequence
 * of audit events.
 *
 * Pattern C: caller fetches the row data (via a feature query over
 * `system_audit_log` joined with `auth.users`) and passes every field
 * in. The row does not self-fetch.
 */

export type AuditLogActor = Readonly<{
  name: string;
  /** Short handle / email / employee id shown under the name. */
  handle?: string;
  /** Optional avatar URL. Falls back to initials. */
  avatarUrl?: string;
}>;

export type AuditLogRowProps = Readonly<{
  actor: AuditLogActor;
  /** Primary action label — e.g. "voided punch", "updated role". */
  action: React.ReactNode;
  /** Timestamp — pre-formatted via `@/lib/date#formatAtFacility`. */
  timestamp: React.ReactNode;
  /** Optional subject / entity label — e.g. "STF_042", "PO-118". */
  subject?: React.ReactNode;
  /**
   * Optional status tag — maps to `<StatusBadge tone={…}>`. Useful for
   * severity or verdict: "approved" → success, "rejected" → danger.
   */
  statusTone?: StatusTone;
  statusLabel?: string;
  /** Expandable details — JSON diff, before/after, policy snippet. */
  details?: React.ReactNode;
  /** Visual density. */
  density?: "default" | "compact";
  /** Render as a button that expands `details` on click (keyboard + click). */
  expandable?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function AuditLogRow({
  actor,
  action,
  timestamp,
  subject,
  statusTone,
  statusLabel,
  details,
  density = "default",
  expandable = false,
  className,
  "data-testid": testId,
}: AuditLogRowProps) {
  const [open, setOpen] = React.useState(false);
  const hasDetails = Boolean(details);
  const interactive = expandable && hasDetails;

  return (
    <article
      data-slot="audit-log-row"
      data-density={density}
      data-state={open ? "open" : undefined}
      data-testid={testId}
      className={cn(
        "border-border-subtle bg-card flex flex-col gap-2 rounded-lg border",
        density === "compact" ? "px-3 py-2" : "px-4 py-3",
        className,
      )}
    >
      <button
        type="button"
        disabled={!interactive}
        onClick={interactive ? () => setOpen((value) => !value) : undefined}
        className={cn(
          "flex min-w-0 items-start gap-3 text-left",
          interactive
            ? "focus-visible:outline-ring cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
            : "cursor-default",
        )}
      >
        <Avatar className="size-8 shrink-0">
          {actor.avatarUrl ? <AvatarImage src={actor.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(actor.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-foreground text-sm font-semibold">{actor.name}</span>
            <span className="text-foreground-muted text-sm">{action}</span>
            {subject ? (
              <span className="bg-surface border-border-subtle text-foreground inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-xs">
                {subject}
              </span>
            ) : null}
          </div>
          <div className="text-foreground-subtle flex flex-wrap items-center gap-2 text-xs">
            <time>{timestamp}</time>
            {actor.handle ? (
              <>
                <span aria-hidden>·</span>
                <span>{actor.handle}</span>
              </>
            ) : null}
            {statusTone && statusLabel ? (
              <StatusBadge
                status={statusLabel.toLowerCase()}
                tone={statusTone}
                label={statusLabel}
              />
            ) : null}
          </div>
        </div>
      </button>
      {hasDetails && (!expandable || open) ? (
        <div data-slot="audit-log-row-details" className="border-border-subtle border-t pt-2">
          {details}
        </div>
      ) : null}
    </article>
  );
}

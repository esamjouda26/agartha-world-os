import * as React from "react";
import { AlertTriangle, Camera, MapPin, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAtFacility } from "@/lib/date";
import { StatusBadge, type StatusEnum } from "@/components/ui/status-badge";

/**
 * IncidentCard — standard incident presentation.
 *
 * Used by [incident-log-page.tsx](src/components/shared/incident-log-page.tsx)
 * and any drill-down that renders a list of incidents (shift review,
 * zone detail, facility daily summary). Renders:
 *
 *   - severity / type badge (mapped via `StatusBadge` with `incident_status`).
 *   - Title + location + reporter + timestamp.
 *   - Optional photo thumbnail (signed URL, TTL ≤ 15 min).
 *   - Category tags.
 *   - Action slot (Resolve / Reassign / View).
 *
 * Pattern C: RSC page fetches incident rows + signed photo URLs and
 * renders the card. The card itself is pure presentation.
 *
 * Stays in `shared/` — same placement policy as its parent
 * `incident-log-page.tsx`.
 */

export type IncidentPhoto = Readonly<{
  id: string;
  /** Signed URL, TTL ≤ 15 min per CLAUDE.md §11. */
  url: string;
  alt: string;
}>;

export type IncidentCardProps = Readonly<{
  title: React.ReactNode;
  /** Free-text summary of the incident. */
  description?: React.ReactNode;
  /** Incident status token — rendered via `<StatusBadge enum="incident_status">`. */
  status: string;
  statusEnum?: StatusEnum;
  /** Reporter display name. */
  reporter: string;
  reporterRole?: string;
  /** Location label — zone name, facility, room. */
  location?: React.ReactNode;
  /** ISO datetime — rendered via `formatAtFacility`. */
  occurredAt: string;
  dateFormat?: string;
  /** Incident type / category badges. */
  tags?: readonly string[];
  photos?: readonly IncidentPhoto[];
  /** Severity tone — drives the left accent bar. */
  severity?: "low" | "medium" | "high" | "critical";
  /** Right-aligned action slot (buttons). */
  actions?: React.ReactNode;
  /** Fires when the card body is clicked. */
  onOpen?: () => void;
  className?: string;
  "data-testid"?: string;
}>;

const SEVERITY_ACCENT: Record<NonNullable<IncidentCardProps["severity"]>, string> = {
  low: "border-l-status-neutral-border",
  medium: "border-l-status-warning-border",
  high: "border-l-status-danger-border",
  critical: "border-l-status-danger-solid",
};

export function IncidentCard({
  title,
  description,
  status,
  statusEnum = "incident_status",
  reporter,
  reporterRole,
  location,
  occurredAt,
  dateFormat = "PPp",
  tags,
  photos,
  severity,
  actions,
  onOpen,
  className,
  "data-testid": testId,
}: IncidentCardProps) {
  const interactive = Boolean(onOpen);
  return (
    <article
      data-slot="incident-card"
      data-severity={severity}
      data-testid={testId}
      className={cn(
        "border-border-subtle bg-card flex flex-col gap-3 rounded-xl border border-l-4 p-4 shadow-xs",
        severity ? SEVERITY_ACCENT[severity] : "border-l-border",
        interactive
          ? "group/incident hover:border-brand-primary/30 cursor-pointer transition-[border-color,box-shadow] duration-[var(--duration-micro)] hover:shadow-md"
          : null,
        className,
      )}
      {...(interactive ? { onClick: onOpen, role: "button", tabIndex: 0 } : {})}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="bg-status-warning-soft text-status-warning-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
          >
            <AlertTriangle className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-foreground text-sm leading-tight font-semibold">{title}</h3>
            <div className="text-foreground-subtle flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span>
                <span className="text-foreground-muted">Reported by </span>
                <span className="text-foreground font-medium">{reporter}</span>
                {reporterRole ? (
                  <span className="text-foreground-muted"> · {reporterRole}</span>
                ) : null}
              </span>
              <span aria-hidden>·</span>
              <time>{formatAtFacility(occurredAt, dateFormat)}</time>
              {location ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden className="size-3" />
                    {location}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <StatusBadge status={status} enum={statusEnum} />
      </header>
      {description ? (
        <p className="text-foreground-muted text-sm leading-relaxed">{description}</p>
      ) : null}
      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border-border-subtle bg-surface/60 text-foreground-muted inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {photos && photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="border-border-subtle bg-background relative block size-16 overflow-hidden rounded-md border"
            >
              {/* Signed URL with TTL ≤ 15 min per CLAUDE.md §11 — not
                  eligible for `next/image` because the host is dynamic
                  per-upload and the URL rotates before the Next image
                  loader could cache it. Same pattern as
                  features/attendance/components/punch-dialog.tsx:309. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} className="size-full object-cover" />
              <span className="absolute right-0.5 bottom-0.5 inline-flex size-4 items-center justify-center rounded-sm bg-black/60 text-white">
                <Camera aria-hidden className="size-2.5" />
              </span>
            </a>
          ))}
          {photos.length > 4 ? (
            <span className="text-foreground-muted inline-flex items-center gap-1 text-xs">
              <Paperclip aria-hidden className="size-3" />
              {photos.length} photos
            </span>
          ) : null}
        </div>
      ) : null}
      {actions ? (
        <footer className="border-border-subtle flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          {actions}
        </footer>
      ) : null}
    </article>
  );
}

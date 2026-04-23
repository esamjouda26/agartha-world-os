import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, Pencil, Plus, Trash2 } from "lucide-react";

import { formatAtFacility } from "@/lib/date";
import { Timeline, type TimelineItem, type TimelineTone } from "@/components/ui/timeline";

/**
 * ActivityTimeline — system_audit_log-shaped timeline renderer.
 *
 * Thin wrapper over `<Timeline>` that maps the common audit verbs
 * (`created`, `updated`, `deleted`, `approved`, `rejected`) to icons +
 * tones so every domain renders audit history consistently. Bound to
 * the `system_audit_log` row shape described in
 * [init_schema.sql](supabase/migrations/) audit partitioning spec.
 *
 * Pattern C: caller fetches events (usually from `system_audit_log`
 * filtered by entity_type + entity_id) and passes them as
 * `ActivityEvent[]`. The component does not import from Supabase.
 */

export type ActivityVerb =
  | "created"
  | "updated"
  | "deleted"
  | "approved"
  | "rejected"
  | "commented"
  | "warning"
  | "info";

export type ActivityEvent = Readonly<{
  id: string;
  verb: ActivityVerb;
  /** Primary title — usually "X verb-ed Y" formatted by the caller. */
  title: React.ReactNode;
  /** ISO datetime string (will be rendered via `formatAtFacility`). */
  occurredAt: string;
  description?: React.ReactNode;
  /** Arbitrary extra slot below the description (diff, link, badge). */
  meta?: React.ReactNode;
}>;

export type ActivityTimelineProps = Readonly<{
  events: readonly ActivityEvent[];
  /** `date-fns-tz` format string. Defaults to "PPpp" (e.g. "Apr 22, 2026, 3:45 PM"). */
  dateFormat?: string;
  className?: string;
  "data-testid"?: string;
}>;

const VERB_META: Record<
  ActivityVerb,
  { tone: TimelineTone; Icon: React.ComponentType<{ className?: string }> }
> = {
  created: { tone: "success", Icon: Plus },
  updated: { tone: "info", Icon: Pencil },
  deleted: { tone: "danger", Icon: Trash2 },
  approved: { tone: "success", Icon: CheckCircle2 },
  rejected: { tone: "danger", Icon: AlertTriangle },
  commented: { tone: "default", Icon: Info },
  warning: { tone: "warning", Icon: AlertTriangle },
  info: { tone: "info", Icon: Info },
};

export function ActivityTimeline({
  events,
  dateFormat = "PPpp",
  className,
  "data-testid": testId,
}: ActivityTimelineProps) {
  const items = React.useMemo<readonly TimelineItem[]>(
    () =>
      events.map((event) => {
        const meta = VERB_META[event.verb];
        const Icon = meta.Icon;
        const base: TimelineItem = {
          id: event.id,
          title: event.title,
          timestamp: formatAtFacility(event.occurredAt, dateFormat),
          icon: <Icon className="size-4" />,
          tone: meta.tone,
        };
        return {
          ...base,
          ...(event.description !== undefined ? { description: event.description } : {}),
          ...(event.meta !== undefined ? { meta: event.meta } : {}),
        };
      }),
    [events, dateFormat],
  );

  return (
    <Timeline
      items={items}
      {...(className !== undefined ? { className } : {})}
      {...(testId !== undefined ? { "data-testid": testId } : {})}
    />
  );
}

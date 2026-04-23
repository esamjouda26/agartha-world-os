import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Timeline — vertical list of timestamped events.
 *
 * Used for device heartbeat history, goods-movement log, incident
 * chronology, audit playback, shift-lifecycle view. Semantic `<ol>`
 * so assistive tech sees it as a sequence.
 *
 * Each item has a leading icon-bubble, a title, and optional
 * description + metadata slot. Tone drives the bubble tint. For a
 * richer audit-log styling bound to `system_audit_log` row shape,
 * use `<ActivityTimeline>` (shared organism).
 */

export type TimelineTone = "default" | "success" | "warning" | "danger" | "info" | "accent";

export type TimelineItem = Readonly<{
  id: string;
  title: React.ReactNode;
  /** Timestamp render — a formatted string OR a `<time>` element. */
  timestamp: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: TimelineTone;
  /** Arbitrary meta slot rendered under the description. */
  meta?: React.ReactNode;
  "data-testid"?: string;
}>;

export type TimelineProps = Readonly<{
  items: readonly TimelineItem[];
  /** Render timestamps on the opposite side of the line (desktop only). */
  alternate?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

const TONE: Record<TimelineTone, string> = {
  default: "bg-surface border-border text-foreground-subtle",
  success: "bg-status-success-soft border-status-success-border text-status-success-foreground",
  warning: "bg-status-warning-soft border-status-warning-border text-status-warning-foreground",
  danger: "bg-status-danger-soft border-status-danger-border text-status-danger-foreground",
  info: "bg-status-info-soft border-status-info-border text-status-info-foreground",
  accent: "bg-status-accent-soft border-status-accent-border text-status-accent-foreground",
};

export function Timeline({
  items,
  alternate = false,
  className,
  "data-testid": testId,
}: TimelineProps) {
  return (
    <ol
      data-slot="timeline"
      data-testid={testId}
      className={cn("relative flex flex-col", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const tone = TONE[item.tone ?? "default"];
        return (
          <li
            key={item.id}
            data-testid={item["data-testid"]}
            className={cn(
              "relative flex gap-4 pb-5",
              isLast ? "pb-0" : null,
              alternate ? "md:even:flex-row-reverse md:even:text-right" : null,
            )}
          >
            <div className="relative flex shrink-0 flex-col items-center">
              <span
                aria-hidden
                data-slot="timeline-bullet"
                data-tone={item.tone ?? "default"}
                className={cn(
                  "z-[1] inline-flex size-8 shrink-0 items-center justify-center rounded-full border",
                  tone,
                )}
              >
                {item.icon ?? <span className="size-1.5 rounded-full bg-current" />}
              </span>
              {!isLast ? (
                <span aria-hidden className="bg-border-subtle absolute top-8 bottom-0 w-px" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-foreground text-sm font-medium">{item.title}</p>
                <time className="text-foreground-subtle text-xs tabular-nums">
                  {item.timestamp}
                </time>
              </div>
              {item.description ? (
                <p className="text-foreground-muted text-sm">{item.description}</p>
              ) : null}
              {item.meta ? <div className="mt-1">{item.meta}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

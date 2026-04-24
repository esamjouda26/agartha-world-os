"use client";

import * as React from "react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HeartbeatEntry } from "@/features/devices/types/device-detail";

type HeartbeatTimelineProps = Readonly<{
  heartbeats: ReadonlyArray<HeartbeatEntry>;
}>;

const STATUS_ICON = {
  online: Wifi,
  offline: WifiOff,
  degraded: AlertTriangle,
} as const;

export function HeartbeatTimeline({ heartbeats }: HeartbeatTimelineProps) {
  return (
    <SectionCard
      title="Heartbeat Timeline"
      description={`Last ${heartbeats.length} recorded heartbeats, newest first.`}
      data-testid="heartbeat-timeline"
    >
      {heartbeats.length === 0 ? (
        <p className="text-foreground-muted py-4 text-center text-sm">
          No heartbeats recorded yet.
        </p>
      ) : (
        <ol className="divide-border-subtle flex flex-col divide-y" role="list">
          {heartbeats.map((hb) => {
            const Icon = STATUS_ICON[hb.status] ?? Wifi;
            return (
              <li
                key={hb.id}
                className="flex items-center gap-3 py-2.5"
                data-testid={`heartbeat-row-${hb.id}`}
              >
                <Icon
                  className={
                    hb.status === "online"
                      ? "text-status-success-foreground size-4 shrink-0"
                      : hb.status === "degraded"
                        ? "text-status-warning-foreground size-4 shrink-0"
                        : "text-status-danger-foreground size-4 shrink-0"
                  }
                  aria-hidden
                />
                <StatusBadge status={hb.status} className="shrink-0" />
                <span className="text-foreground-muted font-mono text-xs tabular-nums">
                  {format(parseISO(hb.recordedAt), "MMM d, yyyy · HH:mm:ss")}
                </span>
                <span className="text-foreground-subtle ml-auto shrink-0 text-xs">
                  {formatDistanceToNow(parseISO(hb.recordedAt), { addSuffix: true })}
                </span>
                {hb.responseTimeMs != null && (
                  <span className="text-foreground-muted shrink-0 font-mono text-xs tabular-nums">
                    {hb.responseTimeMs} ms
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}

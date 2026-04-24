"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Wrench } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import type { MaintenanceOrderEntry } from "@/features/devices/types/device-detail";

type MaintenanceOrderListProps = Readonly<{
  orders: ReadonlyArray<MaintenanceOrderEntry>;
}>;

const TOPOLOGY_LABELS: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
};

export function MaintenanceOrderList({ orders }: MaintenanceOrderListProps) {
  return (
    <SectionCard
      title="Maintenance History"
      description="All maintenance orders targeting this device."
      data-testid="maintenance-order-list"
    >
      {orders.length === 0 ? (
        <p className="text-foreground-muted py-4 text-center text-sm">
          No maintenance orders linked to this device.
        </p>
      ) : (
        <ol className="divide-border-subtle flex flex-col divide-y" role="list">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              data-testid={`mo-row-${order.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Wrench className="text-foreground-subtle size-4 shrink-0" aria-hidden />
                <StatusBadge status={order.status} />
                <Badge variant="outline" className="text-xs">
                  {TOPOLOGY_LABELS[order.topology] ?? order.topology}
                </Badge>
                <span className="text-foreground-subtle text-sm font-medium">
                  {order.vendorName}
                </span>
                {order.scope ? (
                  <span className="text-foreground-muted text-xs">· {order.scope}</span>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-foreground-muted font-mono text-xs tabular-nums">
                  {format(parseISO(order.maintenanceStart), "MMM d, yyyy · HH:mm")}
                </span>
                <span className="text-foreground-muted font-mono text-xs tabular-nums">
                  → {format(parseISO(order.maintenanceEnd), "MMM d, yyyy · HH:mm")}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

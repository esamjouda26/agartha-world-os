"use client";

import * as React from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Clock } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import type { ActiveStaffRow } from "@/features/staffing/queries/list-active-staff";

export type StaffCardProps = Readonly<{
  row: ActiveStaffRow;
}>;

function resolveInitials(displayName: string, employeeId: string | null): string {
  const source = displayName.trim() || employeeId?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return source.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Single card in the active-staff grid. */
export function StaffCard({ row }: StaffCardProps) {
  const clockedInAt = parseISO(row.clockedInAt);
  const onSiteFor = formatDistanceToNowStrict(clockedInAt);

  return (
    <Card
      data-testid={`staffing-card-${row.staffRecordId}`}
      className="transition-shadow hover:shadow-md"
    >
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarFallback>{resolveInitials(row.displayName, row.employeeId)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-foreground truncate text-sm font-semibold" title={row.displayName}>
              {row.displayName || "Unnamed"}
            </p>
            <p className="text-foreground-muted truncate text-xs">
              {row.employeeId ? row.employeeId : "No employee ID"}
              {row.orgUnitName ? ` · ${row.orgUnitName}` : ""}
            </p>
          </div>
        </div>

        {row.roleDisplayName ? (
          <Badge variant="secondary" className="w-fit">
            {row.roleDisplayName}
          </Badge>
        ) : null}

        <div className="border-border-subtle flex items-center justify-between gap-2 border-t pt-2 text-xs">
          <span className="text-foreground-muted inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3" />
            <span>On-site {onSiteFor}</span>
          </span>
          <span
            className="text-foreground-subtle"
            title={`Clocked in at ${format(clockedInAt, "MMM d, HH:mm")}`}
          >
            Since {format(clockedInAt, "HH:mm")}
          </span>
        </div>

        {row.shiftExpectedEndTime ? (
          <p className="text-foreground-subtle text-[11px]">
            Shift ends {row.shiftExpectedEndTime.slice(0, 5)}
            {row.shiftName ? ` · ${row.shiftName}` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

import { CATEGORY_LABEL } from "@/features/incidents/constants";
import type { IncidentRow } from "@/features/incidents/queries/list-incidents";

/**
 * useIncidentColumns — shared TanStack column definitions for the
 * incident list surface.
 *
 * Used by both manager (`incidents-manager-view`) and crew
 * (`incidents-crew-view`) compositions, which differ only in whether
 * the resolve action is rendered. Keeping the columns in a single hook
 * avoids drift between the two views (badge tones, description
 * clamping, timestamp formatting).
 *
 * Column width hints via `meta.{header,cell}ClassName` follow the
 * audit pattern: stable narrow fields (category badge, zone, reporter,
 * timestamp, action) shrink-wrap; description flows naturally to
 * absorb the slack.
 */
export function useIncidentColumns({
  canResolve,
  onResolveClick,
}: {
  canResolve: boolean;
  onResolveClick: (incident: IncidentRow) => void;
}): ColumnDef<IncidentRow, unknown>[] {
  return React.useMemo<ColumnDef<IncidentRow, unknown>[]>(
    () => [
      {
        id: "category",
        header: "Category",
        accessorKey: "category",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            label={CATEGORY_LABEL[row.original.category]}
            tone={row.original.status === "resolved" ? "success" : "warning"}
          />
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "zone",
        header: "Zone",
        accessorKey: "zoneName",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm">{row.original.zoneName ?? "—"}</span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "description",
        header: "Description",
        accessorKey: "description",
        cell: ({ row }) => (
          <span className="text-foreground line-clamp-2 text-sm">{row.original.description}</span>
        ),
      },
      {
        id: "reporter",
        header: "Reported by",
        accessorKey: "reporterName",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm">{row.original.reporterName || "—"}</span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "created_at",
        header: "Opened",
        accessorKey: "createdAt",
        cell: ({ row }) =>
          row.original.status === "resolved" ? (
            <span className="text-foreground-subtle text-xs">
              Resolved{" "}
              {row.original.resolvedAt
                ? formatDistanceToNow(parseISO(row.original.resolvedAt), { addSuffix: true })
                : "—"}
            </span>
          ) : (
            <span className="text-foreground-muted text-sm">
              {formatDistanceToNow(parseISO(row.original.createdAt), { addSuffix: true })}
              <span className="text-foreground-subtle ml-1 text-xs">
                ({format(parseISO(row.original.createdAt), "MMM d")})
              </span>
            </span>
          ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canResolve && row.original.status === "open" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onResolveClick(row.original);
              }}
              data-testid={`incident-row-${row.original.id}-resolve`}
            >
              <CheckCircle2 aria-hidden className="size-4" />
              <span>Resolve</span>
            </Button>
          ) : null,
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [canResolve, onResolveClick],
  );
}

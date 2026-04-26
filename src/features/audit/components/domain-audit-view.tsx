"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/navigation";
import { CursorPagination } from "@/components/shared/cursor-pagination";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";

import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditRowDetail } from "@/features/audit/components/audit-row-detail";
import {
  AUDIT_ACTION_LABEL,
  AUDIT_PAGE_SIZE,
  humanizeEntityType,
  resolveEntityLink,
} from "@/features/audit/constants";
import type { AuditLogPage, AuditLogRow } from "@/features/audit/queries/list-audit-log";
import type { StaffFilterOption } from "@/features/audit/queries/list-staff-for-filter";
import { AUDIT_PAGE_SIZES, encodeCursor } from "@/features/audit/schemas/filters";

export type DomainAuditViewProps = Readonly<{
  allowedEntityTypes: readonly string[];
  staff: readonly StaffFilterOption[];
  page: AuditLogPage;
}>;

const ACTION_TONE: Record<AuditLogRow["action"], "success" | "warning" | "danger"> = {
  insert: "success",
  update: "warning",
  delete: "danger",
};

/**
 * DomainAuditView — the audit list surface.
 *
 * Pure composition over sink primitives — every piece of layout +
 * pagination machinery lives in `<FilterableDataTable>` and
 * `<CursorPagination>`. This file only:
 *   1. Defines audit-specific column shapes (badge tones, entity-link,
 *      timestamp format).
 *   2. Renders the audit-specific filters in the toolbar slot.
 *   3. Encodes the next cursor token from the server response.
 *
 * Column widths are NOT overridden — `table-layout: auto` distributes
 * width naturally based on content. The Expander, Action, and When
 * columns shrink-wrap (stable narrow content); textual columns flow.
 */
export function DomainAuditView({ allowedEntityTypes, staff, page }: DomainAuditViewProps) {
  const columns = React.useMemo<ColumnDef<AuditLogRow, unknown>[]>(
    () => [
      {
        id: "expander",
        header: () => <span className="sr-only">Expand</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation();
              row.toggleExpanded();
            }}
            aria-label={row.getIsExpanded() ? "Collapse details" : "Expand details"}
            aria-expanded={row.getIsExpanded()}
            data-testid={`audit-row-${row.original.id}-toggle`}
          >
            {row.getIsExpanded() ? (
              <ChevronDown aria-hidden className="size-4" />
            ) : (
              <ChevronRight aria-hidden className="size-4" />
            )}
          </Button>
        ),
        meta: {
          // Chevron-only column — shrink to the button width.
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "action",
        header: "Action",
        accessorKey: "action",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.action}
            label={AUDIT_ACTION_LABEL[row.original.action]}
            tone={ACTION_TONE[row.original.action]}
          />
        ),
        meta: {
          // Stable badge width — shrink-wrap so the textual columns
          // absorb width.
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "entity_type",
        header: "Record type",
        accessorKey: "entityType",
        cell: ({ row }) => (
          <span className="text-foreground text-sm font-medium">
            {humanizeEntityType(row.original.entityType)}
          </span>
        ),
      },
      {
        id: "entity_id",
        header: "Record",
        cell: ({ row }) => {
          const link = resolveEntityLink(row.original.entityType, row.original.entityId);
          const display = row.original.entityId ? `${row.original.entityId.slice(0, 8)}…` : "—";
          if (!link || !row.original.entityId) {
            return (
              <span
                className="text-foreground-muted font-mono text-xs"
                title={row.original.entityId ?? undefined}
              >
                {display}
              </span>
            );
          }
          return (
            <Link
              href={link as Route}
              className="text-brand-primary hover:text-brand-primary/80 inline-flex items-center gap-1 font-mono text-xs underline-offset-4 hover:underline"
              title={row.original.entityId}
              onClick={(event) => event.stopPropagation()}
              data-testid={`audit-row-${row.original.id}-link`}
            >
              <span>{display}</span>
              <ExternalLink aria-hidden className="size-3" />
            </Link>
          );
        },
      },
      {
        id: "performed_by",
        header: "Changed by",
        accessorKey: "performedByName",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm">
            {row.original.performedByName || "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "When",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm tabular-nums">
            {format(parseISO(row.original.createdAt), "MMM d, yyyy · HH:mm:ss")}
          </span>
        ),
        meta: {
          // Fixed timestamp width — shrink-wrap + right-align so it pins
          // to the right edge of the table.
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [],
  );

  if (allowedEntityTypes.length === 0) {
    return (
      <EmptyStateCta
        variant="first-use"
        title="No audit scope for your domains"
        description="Ask an admin to grant you read access on the domain whose audit trail you need."
        data-testid="audit-no-access"
      />
    );
  }

  const nextCursorToken = page.nextCursor
    ? encodeCursor(page.nextCursor.createdAt, page.nextCursor.id)
    : null;

  return (
    <FilterableDataTable<AuditLogRow>
      data-testid="audit-table"
      toolbar={<AuditFilters allowedEntityTypes={allowedEntityTypes} staff={staff} />}
      table={{
        data: page.rows,
        columns,
        mobileFieldPriority: ["action", "entity_type", "performed_by", "created_at"],
        getRowId: (row) => row.id,
        renderSubComponent: (row) => <AuditRowDetail row={row.original} />,
      }}
      pagination={
        <CursorPagination
          nextCursorToken={nextCursorToken}
          defaultPageSize={AUDIT_PAGE_SIZE}
          pageSizeOptions={AUDIT_PAGE_SIZES}
          onAfterPaginate={() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          data-testid="audit-pagination"
        />
      }
      emptyState={{
        variant: "filtered-out",
        title: "No audit entries match your filters",
        description: "Widen the date range or clear a filter — not every action leaves a trail.",
        "data-testid": "audit-empty",
      }}
    />
  );
}

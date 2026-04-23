"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";

import { REPORT_LABEL } from "@/features/reports/constants";
import type { ReportExecution } from "@/features/reports/queries/list-executions";

export type ExecutionHistoryTableProps = Readonly<{
  executions: readonly ReportExecution[];
}>;

/**
 * ExecutionHistoryTable — recent report runs.
 *
 * Composes the canonical `<FilterableDataTable>` with a titled header in
 * the toolbar slot (no filters — the view caps at the last 50 runs by
 * query design) and no pagination. Follows the audit pattern so the
 * card chrome is consistent with every other list surface.
 */
export function ExecutionHistoryTable({ executions }: ExecutionHistoryTableProps) {
  const columns = React.useMemo<ColumnDef<ReportExecution, unknown>[]>(
    () => [
      {
        id: "report_type",
        header: "Report",
        accessorKey: "reportType",
        cell: ({ row }) => (
          <span className="text-foreground text-sm font-medium">
            {row.original.reportType ? REPORT_LABEL[row.original.reportType] : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge status={row.original.status} label={row.original.status} />,
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "rows",
        header: "Rows",
        accessorKey: "rowCount",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm tabular-nums">
            {row.original.status === "completed" ? row.original.rowCount : "—"}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "created_by",
        header: "Triggered by",
        accessorKey: "createdByName",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm">{row.original.createdByName || "—"}</span>
        ),
      },
      {
        id: "created_at",
        header: "Run",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm tabular-nums">
            {format(parseISO(row.original.createdAt), "MMM d, yyyy · HH:mm")}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "download",
        header: () => <span className="sr-only">Download</span>,
        cell: ({ row }) =>
          row.original.status === "completed" && row.original.fileUrl ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              data-testid={`report-execution-row-${row.original.id}-download`}
            >
              <a href={row.original.fileUrl} target="_blank" rel="noreferrer">
                <Download aria-hidden className="size-4" />
                <span>CSV</span>
              </a>
            </Button>
          ) : row.original.status === "failed" && row.original.errorMessage ? (
            <span
              className="text-status-danger-foreground text-xs"
              data-testid={`report-execution-row-${row.original.id}-error`}
            >
              {row.original.errorMessage.slice(0, 60)}
              {row.original.errorMessage.length > 60 ? "…" : ""}
            </span>
          ) : null,
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
    ],
    [],
  );

  return (
    <FilterableDataTable<ReportExecution>
      data-testid="report-execution-history"
      toolbar={
        <div className="flex flex-col gap-0.5">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            Execution history
          </h2>
          <p className="text-foreground-muted text-xs">
            Last 50 runs. Downloads expire 7 days after generation — regenerate to refresh.
          </p>
        </div>
      }
      table={{
        data: executions,
        columns,
        mobileFieldPriority: ["report_type", "status", "created_at", "download"],
        getRowId: (row) => row.id,
      }}
      emptyState={{
        variant: "first-use",
        title: "No runs yet",
        description: "Use Generate now or save a schedule to see execution history here.",
        "data-testid": "report-execution-empty",
      }}
    />
  );
}

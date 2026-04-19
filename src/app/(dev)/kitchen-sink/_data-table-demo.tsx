"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Kitchen-sink §9 DataTable demo.
 * Generates 500 synthetic rows locally so virtualization can be observed
 * without networking a real feature slice. No hardcoded domain data — this
 * is a primitive-surface test harness only, not a feature screen.
 */

type DemoRow = Readonly<{
  id: string;
  name: string;
  status: string;
  priority: "low" | "medium" | "high";
  owner: string;
  updated: string;
  count: number;
}>;

const STATUSES: readonly string[] = [
  "active",
  "pending",
  "completed",
  "failed",
  "scheduled",
  "cancelled",
];
const OWNERS: readonly string[] = ["Ariel", "Jamie", "Priya", "Toshiro", "Lena", "Marcus"];

function generateRows(count: number): DemoRow[] {
  const result: DemoRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const status = STATUSES[i % STATUSES.length]!;
    const priorityIndex = i % 3;
    result.push({
      id: `row-${i.toString().padStart(4, "0")}`,
      name: `Demo record ${i + 1}`,
      status,
      priority: priorityIndex === 0 ? "low" : priorityIndex === 1 ? "medium" : "high",
      owner: OWNERS[i % OWNERS.length]!,
      updated: new Date(Date.UTC(2026, 3, 1, 0, 0, i * 17)).toISOString(),
      count: 100 + ((i * 37) % 500),
    });
  }
  return result;
}

const PRIORITY_TONE: Record<DemoRow["priority"], StatusTone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

const columns: ColumnDef<DemoRow, unknown>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        aria-label="Select all rows on page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        aria-label={`Select ${row.original.name}`}
      />
    ),
    enableHiding: false,
    enableSorting: false,
  },
  { id: "name", accessorKey: "name", header: "Name", enableSorting: true },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} enum="booking_status" />,
  },
  {
    id: "priority",
    accessorKey: "priority",
    header: "Priority",
    cell: ({ getValue }) => {
      const value = getValue() as DemoRow["priority"];
      return <StatusBadge status={value} tone={PRIORITY_TONE[value]} />;
    },
  },
  { id: "owner", accessorKey: "owner", header: "Owner" },
  {
    id: "count",
    accessorKey: "count",
    header: "Count",
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums">{Number(getValue()).toLocaleString()}</span>
    ),
  },
  {
    id: "updated",
    accessorKey: "updated",
    header: "Updated",
    cell: ({ getValue }) => {
      const value = String(getValue());
      return <time dateTime={value}>{value.slice(0, 16).replace("T", " ")}</time>;
    },
  },
];

export function DataTableDemo() {
  const [mode, setMode] = React.useState<"standard" | "virtualized" | "empty">("standard");
  const [isLoading, setLoading] = React.useState(false);

  const standardData = React.useMemo(() => generateRows(12), []);
  const virtualizedData = React.useMemo(() => generateRows(500), []);

  const data = mode === "virtualized" ? virtualizedData : mode === "empty" ? [] : standardData;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === "standard" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("standard")}
          data-testid="kitchen-sink-dt-mode-standard"
        >
          Standard (12 rows)
        </Button>
        <Button
          variant={mode === "virtualized" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("virtualized")}
          data-testid="kitchen-sink-dt-mode-virtual"
        >
          Virtualized (500 rows)
        </Button>
        <Button
          variant={mode === "empty" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("empty")}
          data-testid="kitchen-sink-dt-mode-empty"
        >
          Empty state
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLoading(true);
            window.setTimeout(() => setLoading(false), 1_200);
          }}
          data-testid="kitchen-sink-dt-loading"
        >
          Flash skeleton
        </Button>
      </div>

      <DataTable<DemoRow>
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        mobileFieldPriority={["name", "status", "owner", "updated"]}
        isLoading={isLoading}
        rowCount={data.length}
        bulkActionBar={({ selectedIds, clear }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clear();
              }}
            >
              Mark as handled ({selectedIds.length})
            </Button>
          </div>
        )}
        empty={
          <EmptyState
            variant="first-use"
            title="No records yet"
            description="This table is empty because nothing has been generated for this demo mode."
            action={
              <Button size="sm" onClick={() => setMode("standard")}>
                Load the 12-row demo
              </Button>
            }
          />
        }
        data-testid="kitchen-sink-data-table"
      />
    </div>
  );
}

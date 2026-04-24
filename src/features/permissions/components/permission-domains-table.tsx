"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import type { PermissionDomainRow } from "@/features/permissions/types/permission";

type PermissionDomainsTableProps = Readonly<{
  domains: ReadonlyArray<PermissionDomainRow>;
}>;

const COLUMNS: ColumnDef<PermissionDomainRow, unknown>[] = [
  {
    id: "code",
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <span className="text-foreground font-mono text-sm font-medium">{row.original.code}</span>
    ),
    meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-foreground-muted text-sm">{row.original.description ?? "—"}</span>
    ),
  },
];

export function PermissionDomainsTable({ domains }: PermissionDomainsTableProps) {
  return (
    <FilterableDataTable
      data-testid="permission-domains-table"
      emptyState={{
        variant: "first-use" as const,
        title: "No permission domains found",
        description: "Domains are seeded from migrations.",
      }}
      table={{
        data: domains,
        columns: COLUMNS,
        mobileFieldPriority: ["code", "name", "description"],
        getRowId: (row) => row.id,
      }}
    />
  );
}

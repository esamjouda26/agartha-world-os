"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { AUDIT_ACTION_LABEL } from "@/features/audit/constants";
import type { AuditLogRow } from "@/features/audit/queries/list-audit-log";
import { computeDiffRows } from "@/features/audit/utils/diff-values";

export type AuditRowDetailProps = Readonly<{
  row: AuditLogRow;
}>;

/**
 * Expanded row detail — renders a field-level diff table from the
 * audit row's `old_values`/`new_values` JSONB snapshots. Restricted
 * columns are masked client-side per CLAUDE.md §2.
 */
export function AuditRowDetail({ row }: AuditRowDetailProps) {
  const diff = React.useMemo(
    () => computeDiffRows(row.oldValues, row.newValues),
    [row.oldValues, row.newValues],
  );
  const [showUnchanged, setShowUnchanged] = React.useState(false);
  const visibleRows = showUnchanged ? diff : diff.filter((r) => r.changed);

  if (diff.length === 0) {
    return (
      <p className="text-foreground-muted py-4 text-sm" data-testid={`audit-row-${row.id}-no-diff`}>
        No field-level data captured for this {AUDIT_ACTION_LABEL[row.action].toLowerCase()} action.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-2" data-testid={`audit-row-${row.id}-detail`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground-muted text-xs">
          {diff.filter((r) => r.changed).length} changed · {diff.length} total
          {row.ipAddress ? ` · from ${row.ipAddress}` : ""}
        </p>
        {diff.filter((r) => !r.changed).length > 0 ? (
          <button
            type="button"
            onClick={() => setShowUnchanged((v) => !v)}
            className="text-foreground-subtle hover:text-foreground text-xs underline"
            data-testid={`audit-row-${row.id}-toggle-unchanged`}
          >
            {showUnchanged ? "Hide unchanged fields" : "Show unchanged fields"}
          </button>
        ) : null}
      </div>

      <div
        role="table"
        aria-label="Field-level change diff"
        className="border-border-subtle overflow-hidden rounded-lg border"
      >
        <div
          role="row"
          className="border-border-subtle bg-surface/60 text-foreground-muted grid grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-4 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase"
        >
          <span role="columnheader">Field</span>
          <span role="columnheader">Old value</span>
          <span role="columnheader">New value</span>
        </div>
        {visibleRows.length === 0 ? (
          <p className="text-foreground-muted px-4 py-4 text-sm">
            No changed fields. Toggle &ldquo;Show unchanged fields&rdquo; to see the full snapshot.
          </p>
        ) : (
          visibleRows.map((diffRow) => (
            <div
              key={diffRow.field}
              role="row"
              className={cn(
                "border-border-subtle grid grid-cols-[minmax(120px,1fr)_1fr_1fr] items-start gap-4 border-b px-4 py-2 text-sm last:border-b-0",
                !diffRow.changed && "opacity-60",
              )}
              data-testid={`audit-row-${row.id}-diff-${diffRow.field}`}
            >
              <span
                role="cell"
                className="text-foreground flex items-center gap-1.5 font-mono text-xs"
              >
                {diffRow.field}
                {diffRow.restricted ? (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0">
                    <Lock aria-hidden className="size-2.5" />
                    <span className="text-[10px]">restricted</span>
                  </Badge>
                ) : null}
              </span>
              <DiffCell value={diffRow.oldValue} changed={diffRow.changed} side="old" />
              <DiffCell value={diffRow.newValue} changed={diffRow.changed} side="new" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DiffCell({
  value,
  changed,
  side,
}: Readonly<{
  value: string | null;
  changed: boolean;
  side: "old" | "new";
}>) {
  return (
    <span
      role="cell"
      className={cn(
        "font-mono text-xs break-all",
        value === null && "text-foreground-subtle italic",
        changed && side === "old" && "text-status-danger-foreground/80",
        changed && side === "new" && "text-status-success-foreground",
      )}
    >
      {value === null ? "(null)" : value}
    </span>
  );
}

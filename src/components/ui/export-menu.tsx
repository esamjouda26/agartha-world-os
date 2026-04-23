"use client";

import * as React from "react";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ExportMenu — CSV / PDF / XLSX / JSON dropdown for table toolbars.
 *
 * Props-only; the primitive does not know how to export. Each format
 * fires `onExport(format)` — callers wire to a Server Action or
 * `/api/export/*` route handler. Use `disabledFormats` when the
 * underlying query can't support a format (e.g. PDF with > 10k rows).
 *
 * For a dialog-style export with format + date range + recent-exports
 * list, use `<ExportDialog>` (shared organism).
 */

export type ExportFormat = "csv" | "xlsx" | "pdf" | "json";

export type ExportMenuProps = Readonly<{
  formats?: readonly ExportFormat[];
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabledFormats?: readonly ExportFormat[];
  /** Render the trigger in a loading state (e.g. export in flight). */
  pending?: boolean;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  align?: "start" | "center" | "end";
  className?: string;
  "data-testid"?: string;
}>;

const FORMAT_META: Record<
  ExportFormat,
  { label: string; description: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  csv: {
    label: "Export as CSV",
    description: "Comma-separated values",
    Icon: FileText,
  },
  xlsx: {
    label: "Export as XLSX",
    description: "Excel workbook",
    Icon: FileSpreadsheet,
  },
  pdf: {
    label: "Export as PDF",
    description: "Formatted report",
    Icon: FileText,
  },
  json: {
    label: "Export as JSON",
    description: "Raw payload",
    Icon: FileJson,
  },
};

export function ExportMenu({
  formats = ["csv", "xlsx", "pdf"],
  onExport,
  disabledFormats = [],
  pending = false,
  triggerLabel = "Export",
  triggerVariant = "outline",
  triggerSize = "sm",
  align = "end",
  className,
  "data-testid": testId,
}: ExportMenuProps) {
  const disabledSet = React.useMemo(() => new Set(disabledFormats), [disabledFormats]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          disabled={pending}
          data-testid={testId}
          className={className}
        >
          <Download aria-hidden className="size-4" />
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-56">
        <DropdownMenuLabel>Export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => {
          const meta = FORMAT_META[format];
          const Icon = meta.Icon;
          return (
            <DropdownMenuItem
              key={format}
              onSelect={() => {
                void onExport(format);
              }}
              disabled={disabledSet.has(format)}
              data-testid={testId ? `${testId}-${format}` : undefined}
              className="gap-2"
            >
              <Icon aria-hidden className="text-foreground-subtle size-4" />
              <div className="flex flex-col">
                <span className="text-foreground text-sm">{meta.label}</span>
                <span className="text-foreground-muted text-xs">{meta.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

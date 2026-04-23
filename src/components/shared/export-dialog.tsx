"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker";
import type { ExportFormat } from "@/components/ui/export-menu";

/**
 * ExportDialog — full export dialog with format + date range + recent list.
 *
 * Heavier alternative to `<ExportMenu>` — use when the export parameters
 * warrant a dedicated surface: date range filter, optional column
 * trimming, visibility of prior exports with download links. POS daily
 * reconciliation, inventory-snapshot exports, HR payroll exports.
 *
 * Pattern C: caller provides the recent-exports list (fetched server-
 * side) and decides how to kick off the export (Server Action, job
 * queue). The dialog owns only ephemeral input state.
 */

export type ExportRecent = Readonly<{
  id: string;
  label: React.ReactNode;
  /** Rendered under the label (timestamp, size). */
  meta?: React.ReactNode;
  /** Download URL (signed URL with TTL ≤ 15 min, per CLAUDE.md §11). */
  href: string;
  format?: ExportFormat;
}>;

export type ExportDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  formats?: readonly ExportFormat[];
  /** Controlled format selection. */
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  /** When provided, renders a `<DateRangePicker>` between format and actions. */
  dateRange?: DateRangeValue | null;
  onDateRangeChange?: (range: DateRangeValue | null) => void;
  /** Recent exports list for quick re-download. */
  recentExports?: readonly ExportRecent[];
  /** Fires when Generate is pressed. */
  onGenerate: () => void | Promise<void>;
  pending?: boolean;
  generateLabel?: string;
  cancelLabel?: string;
  "data-testid"?: string;
}>;

const FORMAT_META: Record<ExportFormat, { label: string; description: string }> = {
  csv: { label: "CSV", description: "Comma-separated values" },
  xlsx: { label: "XLSX", description: "Excel workbook" },
  pdf: { label: "PDF", description: "Formatted report" },
  json: { label: "JSON", description: "Raw payload" },
};

export function ExportDialog({
  open,
  onOpenChange,
  title = "Export",
  description = "Choose a format and an optional date range.",
  formats = ["csv", "xlsx", "pdf"],
  format,
  onFormatChange,
  dateRange,
  onDateRangeChange,
  recentExports,
  onGenerate,
  pending = false,
  generateLabel = "Generate",
  cancelLabel = "Cancel",
  "data-testid": testId,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(next) => onFormatChange(next as ExportFormat)}
              className={cn("grid grid-cols-1 gap-1 sm:grid-cols-3")}
              data-testid={testId ? `${testId}-format` : undefined}
            >
              {formats.map((value) => {
                const meta = FORMAT_META[value];
                const itemId = `${testId ?? "export"}-${value}`;
                const isActive = format === value;
                return (
                  <Label
                    key={value}
                    htmlFor={itemId}
                    data-state={isActive ? "active" : undefined}
                    className={cn(
                      "border-border-subtle flex cursor-pointer items-start gap-2 rounded-lg border p-3",
                      "transition-colors duration-[var(--duration-micro)]",
                      "hover:border-brand-primary/40",
                      "data-[state=active]:border-brand-primary data-[state=active]:bg-brand-primary/5",
                    )}
                  >
                    <RadioGroupItem value={value} id={itemId} className="mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground text-sm font-medium">{meta.label}</span>
                      <span className="text-foreground-muted text-xs">{meta.description}</span>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {onDateRangeChange ? (
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Date range (optional)</Label>
              <DateRangePicker
                value={dateRange ?? null}
                onChange={onDateRangeChange}
                clearable
                {...(testId ? { "data-testid": `${testId}-range` } : {})}
              />
            </div>
          ) : null}

          {recentExports && recentExports.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Recent exports</Label>
              <ul className="border-border-subtle divide-border-subtle divide-y rounded-lg border">
                {recentExports.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-foreground truncate text-sm">{item.label}</span>
                      {item.meta ? (
                        <span className="text-foreground-muted truncate text-xs">{item.meta}</span>
                      ) : null}
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      data-testid={testId ? `${testId}-recent-${item.id}` : undefined}
                    >
                      <a href={item.href} download aria-label="Download">
                        <Download aria-hidden className="size-4" />
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            data-testid={testId ? `${testId}-cancel` : undefined}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={pending}
            onClick={() => void onGenerate()}
            data-testid={testId ? `${testId}-generate` : undefined}
          >
            <Download aria-hidden className="size-4" />
            {generateLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

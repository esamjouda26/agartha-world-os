"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DATE_RANGE_LABEL, DATE_RANGE_PRESETS } from "@/features/reports/constants";
import type { ReportParameters } from "@/features/reports/schemas/report";

export type DateRangePickerProps = Readonly<{
  value: ReportParameters["date_range"];
  onChange: (next: ReportParameters["date_range"]) => void;
  idPrefix?: string;
}>;

/**
 * Date-range picker for report parameters. Four presets (today /
 * 7d / 30d / custom); "custom" reveals two native date inputs.
 *
 * Local UI state only — caller owns the `value` via RHF or `useState`.
 */
export function DateRangePicker({
  value,
  onChange,
  idPrefix = "report-range",
}: DateRangePickerProps) {
  const presetId = `${idPrefix}-preset`;
  const fromId = `${idPrefix}-from`;
  const toId = `${idPrefix}-to`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={presetId}>Date range</Label>
        <Select
          value={value.preset}
          onValueChange={(p) =>
            onChange({
              preset: p as (typeof DATE_RANGE_PRESETS)[number],
              from: p === "custom" ? value.from : null,
              to: p === "custom" ? value.to : null,
            })
          }
        >
          <SelectTrigger id={presetId} className="h-10 w-full" data-testid={presetId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {DATE_RANGE_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.preset === "custom" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={fromId}>From</Label>
            <Input
              id={fromId}
              type="date"
              value={value.from ?? ""}
              onChange={(e) => onChange({ ...value, from: e.target.value || null })}
              data-testid={fromId}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={toId}>To</Label>
            <Input
              id={toId}
              type="date"
              value={value.to ?? ""}
              onChange={(e) => onChange({ ...value, to: e.target.value || null })}
              data-testid={toId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

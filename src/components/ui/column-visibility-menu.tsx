"use client";

import * as React from "react";
import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ColumnVisibilityMenu — toggle visible columns on a `<DataTable>`.
 *
 * Standalone primitive so callers that do NOT use the full `<DataTable>`
 * (e.g. feature-specific tables that still want a column toggle) can
 * drop it into their own toolbar. `<DataTable>` embeds an identical menu
 * inside its built-in toolbar.
 *
 * Controlled: caller owns the visibility map. Keys are column ids; `true`
 * = visible, `false` = hidden. Missing keys default to visible.
 */

export type ColumnVisibilityItem = Readonly<{
  id: string;
  label: React.ReactNode;
  /** When false the menu item is disabled (e.g. "id" column always on). */
  toggleable?: boolean;
}>;

export type ColumnVisibilityMenuProps = Readonly<{
  columns: readonly ColumnVisibilityItem[];
  value: Readonly<Record<string, boolean>>;
  onChange: (value: Readonly<Record<string, boolean>>) => void;
  triggerLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
  "data-testid"?: string;
}>;

export function ColumnVisibilityMenu({
  columns,
  value,
  onChange,
  triggerLabel = "Columns",
  align = "end",
  className,
  "data-testid": testId,
}: ColumnVisibilityMenuProps) {
  const handleToggle = (id: string, next: boolean): void => {
    onChange({ ...value, [id]: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={testId}
          className={className}
        >
          <Columns3 aria-hidden className="size-4" />
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => {
          const isVisible = value[col.id] ?? true;
          return (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={isVisible}
              disabled={col.toggleable === false}
              onCheckedChange={(next) => handleToggle(col.id, Boolean(next))}
              data-testid={testId ? `${testId}-item-${col.id}` : undefined}
              className="capitalize"
            >
              {col.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

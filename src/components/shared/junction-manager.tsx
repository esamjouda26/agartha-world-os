"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";

/**
 * JunctionManager — generic junction-row CRUD surface.
 *
 * Handles the "pick from master list → assign to current → unassign some
 * → bulk add more" pattern behind every many-to-many relationship:
 *
 *   - `location_allowed_categories` — location ↔ category.
 *   - `material_modifier_groups`    — material ↔ modifier group.
 *   - `staff_role_assignments`      — staff ↔ role.
 *   - `pos_point_categories`        — pos point ↔ category.
 *
 * Pattern C: the caller fetches both "all options" and "currently
 * assigned" from server actions and supplies both via props. The
 * component owns only ephemeral selection state (checkbox multi-select
 * for bulk unassign). Every mutation hands back an array to the caller
 * — we do NOT mutate state in place.
 *
 * Rendering is table-agnostic on purpose — callers render the current-
 * assignments list however suits the domain (table, card list, chip
 * cloud). The manager provides the top controls (multi-select + Add
 * button + bulk unassign bar) and the container chrome.
 */

export type JunctionManagerProps = Readonly<{
  /** Label shown above the control row (e.g. "Allowed categories"). */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Full catalog of options the user can add. */
  options: readonly MultiSelectOption[];
  /** Currently assigned values — used to pre-filter the add-picker. */
  assignedValues: readonly string[];
  /** Fires with the set of values to add. */
  onAdd: (values: readonly string[]) => void | Promise<void>;
  /** Fires with the set of values to remove (bulk). */
  onRemove: (values: readonly string[]) => void | Promise<void>;
  /** Slot for the rendered current-assignments surface (list/table). */
  children: React.ReactNode;
  /**
   * Selected values from the rendered list (for bulk unassign). Caller
   * owns selection state in the assignments list; the manager only
   * renders the bulk action bar based on it.
   */
  selectedForRemoval?: readonly string[];
  onSelectionClear?: () => void;
  addLabel?: string;
  removeLabel?: string;
  pickerPlaceholder?: string;
  pickerSearchPlaceholder?: string;
  pickerEmptyLabel?: string;
  /** Disable all controls (e.g. during a pending mutation). */
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

export function JunctionManager({
  title,
  description,
  options,
  assignedValues,
  onAdd,
  onRemove,
  children,
  selectedForRemoval = [],
  onSelectionClear,
  addLabel = "Add",
  removeLabel = "Remove",
  pickerPlaceholder = "Select items to add…",
  pickerSearchPlaceholder = "Search options…",
  pickerEmptyLabel = "Nothing left to add.",
  disabled = false,
  className,
  "data-testid": testId,
}: JunctionManagerProps) {
  const [pending, setPending] = React.useState<"add" | "remove" | null>(null);
  const [stagedForAdd, setStagedForAdd] = React.useState<readonly string[]>([]);

  const assignedSet = React.useMemo(() => new Set(assignedValues), [assignedValues]);
  const availableOptions = React.useMemo(
    () => options.filter((opt) => !assignedSet.has(opt.value)),
    [options, assignedSet],
  );

  const handleAdd = async (): Promise<void> => {
    if (stagedForAdd.length === 0) return;
    try {
      setPending("add");
      await onAdd(stagedForAdd);
      setStagedForAdd([]);
    } finally {
      setPending(null);
    }
  };

  const handleBulkRemove = async (): Promise<void> => {
    if (selectedForRemoval.length === 0) return;
    try {
      setPending("remove");
      await onRemove(selectedForRemoval);
    } finally {
      setPending(null);
    }
  };

  return (
    <section
      data-slot="junction-manager"
      data-testid={testId}
      className={cn("flex flex-col gap-3", className)}
    >
      {title || description ? (
        <header className="flex flex-col gap-0.5">
          {title ? <h3 className="text-foreground text-sm font-semibold">{title}</h3> : null}
          {description ? <p className="text-foreground-muted text-xs">{description}</p> : null}
        </header>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex-1">
          <MultiSelect
            value={stagedForAdd}
            onChange={setStagedForAdd}
            options={availableOptions}
            placeholder={pickerPlaceholder}
            searchPlaceholder={pickerSearchPlaceholder}
            emptyLabel={pickerEmptyLabel}
            disabled={disabled || availableOptions.length === 0}
            {...(testId ? { "data-testid": `${testId}-picker` } : {})}
          />
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={disabled || pending === "add" || stagedForAdd.length === 0}
          onClick={() => void handleAdd()}
          data-testid={testId ? `${testId}-add` : undefined}
        >
          <Plus aria-hidden className="size-4" />
          {addLabel}
          {stagedForAdd.length > 0 ? (
            <span className="ml-1 tabular-nums">({stagedForAdd.length})</span>
          ) : null}
        </Button>
      </div>

      <BulkActionBar
        selectedCount={selectedForRemoval.length}
        onClear={() => onSelectionClear?.()}
        {...(testId ? { "data-testid": `${testId}-bulk-bar` } : {})}
        actions={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={disabled || pending === "remove"}
            onClick={() => void handleBulkRemove()}
            {...(testId ? { "data-testid": `${testId}-remove` } : {})}
          >
            {removeLabel}
          </Button>
        }
      />

      <div data-slot="junction-manager-assignments">{children}</div>
    </section>
  );
}

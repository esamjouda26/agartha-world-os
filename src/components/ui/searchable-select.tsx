"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * SearchableSelect — combobox primitive (Phase 2A/2B extension).
 *
 * Popover trigger shows the current selection; opening reveals a
 * `<Command>` surface with live keyboard-navigable search. Options
 * are filtered client-side by cmdk's default matcher (lowercase
 * substring across the `searchValue` field).
 *
 * Use when:
 *   - You have a finite, known-ahead options list (50-5000 items).
 *   - Users benefit from keyboard search over scrolling a plain Select.
 *
 * Do NOT use for:
 *   - Async / server-paginated lookups — write a dedicated combobox
 *     that manages its own fetch state (Phase 2A/2B extension #2 when
 *     that requirement lands).
 *   - Multi-select — pass an array-aware sibling primitive instead.
 *
 * Accessibility: inherits cmdk's `role="combobox"` + `aria-expanded`
 * wiring from `<CommandPrimitive>`, adds `aria-invalid` pass-through,
 * exposes `data-testid` on both trigger and listbox item.
 *
 * Controlled-only: caller owns `value` + `onChange`. Placeholder +
 * empty-search copy + `clearable` are the only cosmetic knobs.
 */

export type SearchableSelectOption = Readonly<{
  /** Stable identifier — emitted by `onChange`. */
  value: string;
  /** Primary rendered label. Becomes the trigger display when selected. */
  label: string;
  /** Optional muted sub-line under the label (e.g. email, employee ID). */
  description?: string;
  /** Optional override for the string cmdk's matcher indexes. Defaults to
   *  `"${label} ${description ?? ''}"` — override when you want to add
   *  aliases (e.g. include an employee_id that isn't in the visible copy). */
  searchValue?: string;
}>;

export type SearchableSelectProps = Readonly<{
  /** Current selection (option `value`). `null` = no selection. */
  value: string | null;
  /** Fires with the new `value` on selection, or `null` on clear. */
  onChange: (value: string | null) => void;
  options: readonly SearchableSelectOption[];
  /** Trigger placeholder when `value` is `null`. */
  placeholder?: string;
  /** Input placeholder inside the popover. */
  searchPlaceholder?: string;
  /** Copy shown when the search yields zero matches. */
  emptyLabel?: string;
  /** Render an `×` clear button inside the trigger when a value is set. */
  clearable?: boolean;
  /** Disable the trigger entirely (propagates `aria-disabled`). */
  disabled?: boolean;
  /** Sets `aria-invalid` on the trigger + styles it as an error state. */
  "aria-invalid"?: boolean;
  /** `data-testid` applied to the trigger AND as a prefix for each item
   *  (`${testId}-item-${value}`). */
  "data-testid"?: string;
  /** Popover width — defaults to match the trigger width. */
  contentClassName?: string;
  /** Optional extra classes on the trigger. */
  className?: string;
  /** Optional id to wire up `<label htmlFor>` from the form primitive. */
  id?: string;
  /** Optional labels for screen readers when the visual label is remote. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}>;

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No results.",
  clearable = false,
  disabled = false,
  "aria-invalid": ariaInvalid,
  "data-testid": testId,
  contentClassName,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  const handleSelect = (next: string) => {
    onChange(next === value ? null : next);
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          id={id}
          aria-expanded={open}
          aria-invalid={ariaInvalid || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "h-10 w-full justify-between font-normal",
            !selected && "text-foreground-subtle",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          <span className="truncate text-left">{selected ? selected.label : placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                onClick={handleClear}
                className="text-foreground-subtle hover:text-foreground inline-flex size-4 items-center justify-center rounded"
                data-testid={testId ? `${testId}-clear` : undefined}
              >
                <X aria-hidden className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown aria-hidden className="text-foreground-subtle size-4" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)}
      >
        <Command
          // Provide a custom filter that respects a row's `searchValue`
          // override so aliases (e.g. employee_id) match without being
          // visually rendered in the list.
          filter={(optionValue, search) => {
            const opt = options.find((o) => o.value === optionValue);
            if (!opt) return 0;
            const haystack = (
              opt.searchValue ?? `${opt.label} ${opt.description ?? ""}`
            ).toLowerCase();
            const needle = search.toLowerCase().trim();
            if (needle.length === 0) return 1;
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            data-testid={testId ? `${testId}-search` : undefined}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={handleSelect}
                    data-testid={testId ? `${testId}-item-${opt.value}` : undefined}
                    aria-selected={isSelected}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-foreground truncate text-sm">{opt.label}</span>
                      {opt.description ? (
                        <span className="text-foreground-muted truncate text-xs">
                          {opt.description}
                        </span>
                      ) : null}
                    </div>
                    <Check
                      aria-hidden
                      className={cn(
                        "ml-2 size-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

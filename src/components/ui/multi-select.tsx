"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
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

/**
 * MultiSelect — searchable combobox that returns an array of values.
 *
 * Peer to `<SearchableSelect>`. Same finite-options contract (50–5000
 * items, no async pagination) and same trigger chrome. Used for
 * junction-manager assignments, tag / category filters, permission /
 * role pickers, and any filter bar where several values are valid
 * simultaneously.
 *
 * Trigger shows chips for the selected items (up to `maxVisibleChips`),
 * then collapses the remainder into a `+N` overflow pill. The popover
 * stays open after each selection so users can pick several without
 * reopening.
 */

export type MultiSelectOption = Readonly<{
  value: string;
  label: string;
  description?: string;
  searchValue?: string;
  disabled?: boolean;
}>;

export type MultiSelectProps = Readonly<{
  value: readonly string[];
  onChange: (value: readonly string[]) => void;
  options: readonly MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Max chip count rendered inside the trigger before overflow collapse. */
  maxVisibleChips?: number;
  /** Render an outer × to clear all selections. */
  clearable?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
  className?: string;
  contentClassName?: string;
  "data-testid"?: string;
}>;

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No results.",
  maxVisibleChips = 3,
  clearable = false,
  disabled = false,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  id,
  className,
  contentClassName,
  "data-testid": testId,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const selected = React.useMemo(
    () => options.filter((opt) => selectedSet.has(opt.value)),
    [options, selectedSet],
  );

  const handleToggle = (optionValue: string): void => {
    if (selectedSet.has(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemoveChip = (event: React.MouseEvent, optionValue: string): void => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const handleClearAll = (event: React.MouseEvent): void => {
    event.stopPropagation();
    onChange([]);
  };

  const visibleChips = selected.slice(0, maxVisibleChips);
  const overflowCount = selected.length - visibleChips.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          {...(id !== undefined ? { id } : {})}
          aria-expanded={open}
          aria-invalid={ariaInvalid || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "h-auto min-h-10 w-full justify-between font-normal",
            selected.length === 0 && "text-foreground-subtle",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          <span className="flex min-w-0 flex-wrap items-center gap-1 py-1 text-left">
            {selected.length === 0 ? (
              placeholder
            ) : (
              <>
                {visibleChips.map((opt) => (
                  <span
                    key={opt.value}
                    className="border-border-subtle bg-surface/80 text-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
                  >
                    <span className="truncate">{opt.label}</span>
                    {!disabled ? (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Remove ${opt.label}`}
                        onClick={(event) => handleRemoveChip(event, opt.value)}
                        className="text-foreground-subtle hover:text-foreground inline-flex size-3.5 items-center justify-center rounded"
                      >
                        <X aria-hidden className="size-3" />
                      </span>
                    ) : null}
                  </span>
                ))}
                {overflowCount > 0 ? (
                  <span className="border-border-subtle text-foreground-muted inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs">
                    +{overflowCount}
                  </span>
                ) : null}
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected.length > 0 ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear all"
                onClick={handleClearAll}
                data-testid={testId ? `${testId}-clear` : undefined}
                className="text-foreground-subtle hover:text-foreground inline-flex size-4 items-center justify-center rounded"
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
                const isSelected = selectedSet.has(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    disabled={Boolean(opt.disabled)}
                    onSelect={() => handleToggle(opt.value)}
                    aria-selected={isSelected}
                    {...(testId ? { "data-testid": `${testId}-item-${opt.value}` } : {})}
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

"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * ChipInput — free-form tag/chip entry.
 *
 * Unlike `<MultiSelect>` which binds to a finite options list, ChipInput
 * accepts arbitrary strings — used for promo tiers, free-form category
 * tags, email invite lists, etc. Chips commit on Enter, comma, or blur;
 * Backspace in an empty input removes the trailing chip.
 *
 * Callers may pass `validate` to reject chips (duplicates, bad emails,
 * max length) before they commit. The primitive does not dedupe — if
 * callers want deduplication, they enforce it inside `validate`.
 */

export type ChipInputProps = Readonly<{
  value: readonly string[];
  onChange: (value: readonly string[]) => void;
  placeholder?: string;
  /** Characters that commit the current input. Defaults to `[",", "Enter"]`. */
  commitKeys?: readonly string[];
  /** Returns `true` to accept, or a string error to display. */
  validate?: (candidate: string, existing: readonly string[]) => true | string;
  /** Optional cap on chip count. */
  maxChips?: number;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  id?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function ChipInput({
  value,
  onChange,
  placeholder,
  commitKeys = [",", "Enter"],
  validate,
  maxChips,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  id,
  className,
  "data-testid": testId,
}: ChipInputProps) {
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (candidate: string): void => {
    const trimmed = candidate.trim();
    if (trimmed.length === 0) return;
    if (maxChips !== undefined && value.length >= maxChips) {
      setError(`Maximum ${maxChips} item${maxChips === 1 ? "" : "s"}.`);
      return;
    }
    const verdict = validate ? validate(trimmed, value) : true;
    if (verdict !== true) {
      setError(verdict);
      return;
    }
    setError(null);
    setDraft("");
    onChange([...value, trimmed]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (commitKeys.includes(event.key)) {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const handleRemove = (index: number): void => {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  return (
    <div
      data-slot="chip-input"
      data-testid={testId}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "border-input bg-surface/60 text-foreground",
        "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-lg border px-2 py-1 text-sm shadow-xs",
        "transition-[color,background-color,border-color,box-shadow] duration-[var(--duration-micro)]",
        "hover:border-border-strong/60",
        "focus-within:border-ring focus-within:bg-background focus-within:ring-ring/40 focus-within:ring-[3px]",
        ariaInvalid && "border-destructive",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {value.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="border-border-subtle bg-background text-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
        >
          <span className="truncate">{chip}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleRemove(index);
            }}
            disabled={disabled}
            aria-label={`Remove ${chip}`}
            data-testid={testId ? `${testId}-remove-${index}` : undefined}
            className="text-foreground-subtle hover:text-foreground inline-flex size-3.5 items-center justify-center rounded"
          >
            <X aria-hidden className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        {...(id !== undefined ? { id } : {})}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        data-testid={testId ? `${testId}-input` : undefined}
        className="placeholder:text-foreground-subtle min-w-[6rem] flex-1 border-0 bg-transparent p-1 text-sm outline-none"
      />
      {error ? (
        <p role="alert" className="text-status-danger-foreground w-full px-1 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

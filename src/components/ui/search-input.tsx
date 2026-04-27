"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * SearchInput — `<Input>` + magnifier icon + clear-X + optional debounce.
 *
 * Replaces the hand-rolled `<div className="relative"><Search …/><Input/>`
 * pattern that recurs on every list page. Wraps `<Input>` so all focus/
 * hover tokens propagate.
 *
 * Two controlled modes:
 *   - immediate: caller owns `value` + `onChange`, fires every keystroke.
 *   - debounced: caller passes `debounceMs` — local state buffers input
 *     and `onChange` fires after the caller-specified window.
 *
 * Use for page-level search where the caller is a client component
 * binding to URL params via `nuqs`. For autocomplete lookups, compose
 * `<Command>` instead.
 */

export type SearchInputProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * When set, keystrokes buffer in local state and `onChange` fires after
   * this many ms of idle. Clearing via the × button bypasses the delay.
   */
  debounceMs?: number;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
  name?: string;
  className?: string;
  "data-testid"?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}>;

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounceMs,
  disabled = false,
  "aria-label": ariaLabel,
  id,
  name,
  className,
  "data-testid": testId,
  onKeyDown,
}: SearchInputProps) {
  const [local, setLocal] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes into local state (e.g. URL param reset).
  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  const emit = React.useCallback(
    (next: string) => {
      if (!debounceMs) {
        onChange(next);
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onChange(next), debounceMs);
    },
    [debounceMs, onChange],
  );

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.value;
    setLocal(next);
    emit(next);
  };

  const handleClear = (): void => {
    if (timer.current) clearTimeout(timer.current);
    setLocal("");
    onChange("");
  };

  return (
    <div
      data-slot="search-input"
      data-testid={testId}
      className={cn("relative flex w-full items-center", className)}
    >
      <Search
        aria-hidden
        className="text-foreground-subtle pointer-events-none absolute left-3 size-4"
      />
      <Input
        type="search"
        role="searchbox"
        {...(id !== undefined ? { id } : {})}
        {...(name !== undefined ? { name } : {})}
        value={local}
        onChange={handleChange}
        {...(onKeyDown !== undefined ? { onKeyDown } : {})}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        // pr-9/pl-9 reserve space for the magnifier icon (left) and our
        // custom clear button (right). The two `[&::*]` arbitrary variants
        // suppress the user-agent clear glyphs that Chrome/Safari/Edge
        // render natively for `type="search"` (`::-webkit-search-cancel-button`)
        // and legacy IE/Edge (`::-ms-clear`) — without these, both the
        // browser's × and our themed × stack on the right edge.
        className="pr-9 pl-9 [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {local.length > 0 ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          data-testid={testId ? `${testId}-clear` : undefined}
          className={cn(
            "text-foreground-subtle hover:text-foreground absolute right-2 inline-flex size-6 items-center justify-center rounded-md",
            "transition-colors duration-[var(--duration-micro)]",
            "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

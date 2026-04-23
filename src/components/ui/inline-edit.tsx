"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * InlineEdit — click-to-edit text field.
 *
 * Display mode shows the value + a pencil icon on hover. Activating the
 * pencil (click or Enter) swaps to an `<Input>` + save/cancel buttons.
 * Enter saves, Escape cancels. Used for notes, override reasons, staff
 * clarifications — anywhere the edit surface should not open a dialog.
 *
 * Controlled: caller owns `value`. `onSave` receives the draft; return a
 * promise to show a pending state (Save button disables). When `onSave`
 * rejects, the error surfaces via `onError` (caller handles toast).
 */

export type InlineEditProps = Readonly<{
  value: string;
  onSave: (next: string) => void | Promise<void>;
  placeholder?: string;
  /** Pre-edit transform (e.g. show "—" when value is empty). */
  emptyFallback?: React.ReactNode;
  /** Optional `onError` callback (fires on reject). */
  onError?: (error: unknown) => void;
  /** Optional validator. Return a string to reject with an inline error. */
  validate?: (candidate: string) => string | null;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function InlineEdit({
  value,
  onSave,
  placeholder,
  emptyFallback = "—",
  onError,
  validate,
  disabled = false,
  "aria-label": ariaLabel,
  className,
  "data-testid": testId,
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const reset = (): void => {
    setDraft(value);
    setEditing(false);
    setError(null);
  };

  const commit = async (): Promise<void> => {
    const normalized = draft.trim();
    if (validate) {
      const verdict = validate(normalized);
      if (verdict) {
        setError(verdict);
        return;
      }
    }
    if (normalized === value) {
      reset();
      return;
    }
    try {
      setPending(true);
      await onSave(normalized);
      setEditing(false);
      setError(null);
    } catch (err) {
      onError?.(err);
    } finally {
      setPending(false);
    }
  };

  if (!editing) {
    return (
      <div
        data-slot="inline-edit"
        data-testid={testId}
        className={cn("group/inline-edit inline-flex items-center gap-1.5", className)}
      >
        <span
          className={cn("text-foreground text-sm", value.length === 0 && "text-foreground-subtle")}
        >
          {value.length > 0 ? value : emptyFallback}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={ariaLabel ?? "Edit"}
          disabled={disabled}
          onClick={() => setEditing(true)}
          data-testid={testId ? `${testId}-edit` : undefined}
          className="opacity-0 group-hover/inline-edit:opacity-100 focus-visible:opacity-100"
        >
          <Pencil aria-hidden className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      data-slot="inline-edit"
      data-state="editing"
      data-testid={testId}
      className={cn("flex flex-col gap-1", className)}
    >
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              reset();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel ?? "Edit value"}
          aria-invalid={error ? true : undefined}
          disabled={pending}
          data-testid={testId ? `${testId}-input` : undefined}
          className="h-8"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Save"
          disabled={pending}
          onClick={() => void commit()}
          data-testid={testId ? `${testId}-save` : undefined}
        >
          <Check aria-hidden className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Cancel"
          disabled={pending}
          onClick={reset}
          data-testid={testId ? `${testId}-cancel` : undefined}
        >
          <X aria-hidden className="size-4" />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-status-danger-foreground text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * OtpInput — accessible, paste-friendly N-digit code entry.
 *
 * Used by /my-booking/verify (Phase 9a Route 4) and ready for staff MFA
 * if that surface ever lands. Lives in `src/components/shared/` per the
 * Phase 9a Component Creation Contract because it's reusable across
 * authentication surfaces.
 *
 * Behaviour:
 *   - N independent <input> boxes; default N=6.
 *   - Each box accepts one digit (`type="tel"`, `inputmode="numeric"`,
 *     `maxLength=1`, `pattern="\d*"`).
 *   - Typing a digit auto-advances focus to the next box.
 *   - Backspace on an empty box jumps back to the previous one and
 *     clears it.
 *   - Pasting a 6-digit string into any box distributes the digits and
 *     focuses the next-empty (or last) box.
 *   - `onComplete(value)` fires once all N digits are filled — caller
 *     uses this to auto-submit.
 *
 * Pure controlled — caller owns `value` (a string of length 0..N) and
 * `onChange(next)`.
 */

export type OtpInputProps = Readonly<{
  value: string;
  onChange: (next: string) => void;
  /** Fires once `value.length === length`. */
  onComplete?: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  className,
  "data-testid": testId,
}: OtpInputProps) {
  const inputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const [completedFor, setCompletedFor] = React.useState<string | null>(null);

  // Trigger onComplete once when value reaches `length`. Reset when value
  // shrinks so a re-completion fires again.
  React.useEffect(() => {
    if (value.length === length && completedFor !== value) {
      setCompletedFor(value);
      onComplete?.(value);
    } else if (value.length < length && completedFor !== null) {
      setCompletedFor(null);
    }
  }, [value, length, onComplete, completedFor]);

  const setDigit = (idx: number, digit: string): void => {
    const cleaned = digit.replace(/\D/g, "").slice(0, 1);
    const chars = value.padEnd(length, " ").split("");
    chars[idx] = cleaned || " ";
    const next = chars.join("").trimEnd();
    onChange(next);
  };

  const focusInput = (idx: number): void => {
    const el = inputs.current[Math.max(0, Math.min(length - 1, idx))];
    el?.focus();
    el?.select();
  };

  const onChangeBox = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length > 1) {
      // Most likely a paste in a single-character input. Distribute.
      handlePaste(idx, raw);
      return;
    }
    setDigit(idx, raw);
    if (raw && idx < length - 1) focusInput(idx + 1);
  };

  const handlePaste = (idx: number, pasted: string): void => {
    const digits = pasted.replace(/\D/g, "").slice(0, length - idx);
    if (!digits) return;
    const chars = value.padEnd(length, " ").split("");
    for (let i = 0; i < digits.length; i++) {
      chars[idx + i] = digits[i] ?? " ";
    }
    const next = chars.join("").trimEnd();
    onChange(next);
    const targetIdx = Math.min(length - 1, idx + digits.length);
    requestAnimationFrame(() => focusInput(targetIdx));
  };

  const onPasteBox = (idx: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    e.preventDefault();
    handlePaste(idx, pasted);
  };

  const onKeyDownBox = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const current = value[idx] ?? "";
      if (!current && idx > 0) {
        e.preventDefault();
        setDigit(idx - 1, "");
        focusInput(idx - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusInput(idx - 1);
      return;
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      focusInput(idx + 1);
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? `Enter ${length}-digit code`}
      data-testid={testId ?? "otp-input"}
      className={cn("flex items-center justify-center gap-2", className)}
    >
      {Array.from({ length }).map((_, idx) => {
        const digit = value[idx] ?? "";
        return (
          <input
            key={idx}
            ref={(el) => {
              inputs.current[idx] = el;
            }}
            type="tel"
            inputMode="numeric"
            pattern="\d*"
            autoComplete={idx === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-invalid={ariaInvalid || undefined}
            aria-label={`Digit ${idx + 1} of ${length}`}
            data-testid={`otp-input-box-${idx}`}
            autoFocus={autoFocus && idx === 0}
            onChange={onChangeBox(idx)}
            onKeyDown={onKeyDownBox(idx)}
            onPaste={onPasteBox(idx)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "size-12 rounded-md border text-center font-mono text-xl font-semibold tabular-nums sm:size-14 sm:text-2xl",
              "transition-[border-color,box-shadow] duration-[var(--duration-small)] outline-none",
              "focus-visible:border-brand-primary focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-60",
              ariaInvalid
                ? "border-status-danger-border bg-status-danger-soft/40 text-status-danger-foreground"
                : "border-border bg-card text-foreground",
            )}
          />
        );
      })}
    </div>
  );
}

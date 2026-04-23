"use client";

import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { format } from "date-fns";

import {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import { parseIsoDateLocal } from "@/lib/date";
import { useResetParams } from "@/components/shared/url-state-helpers";

/**
 * UrlDateRangePicker — `<DateRangePicker>` with self-managed URL state.
 *
 * Owns the from/to URL params + default-range handling + cursor reset
 * machinery the audit migration originally hand-rolled (~60 LOC of
 * boilerplate per filter page). Drop-in for the controlled
 * `<DateRangePicker>` — pass `fromParam` + `toParam` instead of `value`
 * + `onChange`.
 *
 * Default-range semantics: when the URL is empty AND `defaultRange` is
 * provided, the picker DISPLAYS the default but does NOT write it to
 * the URL (matches the server's "empty URL = use default window"
 * convention so deep-links stay short and round-trip cleanly).
 *
 * Date format: from/to are written as `YYYY-MM-DD` strings (server-
 * compatible with Postgres `DATE` columns and `z.string().date()`).
 */

const NUQS_OPTS = {
  clearOnDefault: true,
  history: "replace" as const,
  shallow: false as const,
};

export type UrlDateRangePickerProps = Readonly<
  Omit<DateRangePickerProps, "value" | "onChange"> & {
    /** URL param name for the start date. Defaults to `"from"`. */
    fromParam?: string;
    /** URL param name for the end date. Defaults to `"to"`. */
    toParam?: string;
    /**
     * Computes the default range to display when the URL has no
     * `from`/`to` set. The default is rendered visually but NOT
     * written to the URL — matches the server's "empty URL = default
     * window" convention. When omitted, the picker shows its
     * placeholder text on empty URL.
     */
    defaultRange?: () => DateRangeValue;
    /** Other URL params to clear on every change (typically cursor + crumbs). */
    resetParams?: readonly string[];
  }
>;

export function UrlDateRangePicker({
  fromParam = "from",
  toParam = "to",
  defaultRange,
  resetParams,
  ...rest
}: UrlDateRangePickerProps) {
  const [from, setFrom] = useQueryState(fromParam, parseAsString.withOptions(NUQS_OPTS));
  const [to, setTo] = useQueryState(toParam, parseAsString.withOptions(NUQS_OPTS));
  const reset = useResetParams(resetParams);

  // Memoize the default once so the comparison below doesn't churn on
  // every render. The caller's `defaultRange` should be stable (or
  // referentially-stable via `useCallback`); if they pass a fresh fn
  // each render the default WILL recompute, but the picker output is
  // unchanged on identical resolved ranges.
  const defaultValue = React.useMemo(() => (defaultRange ? defaultRange() : null), [defaultRange]);

  // URL-backed range. `null` when the URL is empty.
  const urlRange: DateRangeValue | null = React.useMemo(() => {
    if (!from || !to) return null;
    return { from: parseIsoDateLocal(from), to: parseIsoDateLocal(to) };
  }, [from, to]);

  // The displayed range falls back to `defaultValue` when URL is empty.
  // When `defaultValue` is also null, the picker renders its placeholder.
  const displayValue: DateRangeValue | null = urlRange ?? defaultValue;

  const handleChange = React.useCallback(
    (next: DateRangeValue | null): void => {
      // Clear path: drop both params, run reset side effects.
      if (!next) {
        void setFrom(null);
        void setTo(null);
        reset();
        return;
      }
      // If the user picked the default range, omit from/to from the
      // URL so deep-links stay short. The server resolves missing
      // from/to → its own default window (matches what the picker
      // displayed).
      if (
        defaultValue &&
        next.from.getTime() === defaultValue.from.getTime() &&
        next.to.getTime() === defaultValue.to.getTime()
      ) {
        void setFrom(null);
        void setTo(null);
      } else {
        void setFrom(format(next.from, "yyyy-MM-dd"));
        void setTo(format(next.to, "yyyy-MM-dd"));
      }
      reset();
    },
    [defaultValue, setFrom, setTo, reset],
  );

  return <DateRangePicker {...rest} value={displayValue} onChange={handleChange} />;
}

/**
 * Companion hook — exposes the resolved URL range AND a helper to
 * write a new range. Use when a feature page needs to read the same
 * URL state without mounting a second `<UrlDateRangePicker>` (e.g.,
 * a filter chip outside the picker that displays the active range).
 */
export function useUrlDateRange(
  fromParam: string = "from",
  toParam: string = "to",
): {
  range: DateRangeValue | null;
} {
  const [from] = useQueryState(fromParam, parseAsString);
  const [to] = useQueryState(toParam, parseAsString);
  const range: DateRangeValue | null = React.useMemo(() => {
    if (!from || !to) return null;
    return { from: parseIsoDateLocal(from), to: parseIsoDateLocal(to) };
  }, [from, to]);
  return { range };
}

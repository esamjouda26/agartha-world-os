"use client";

import * as React from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";

/**
 * url-state-helpers — small reusable nuqs-binding hooks for filters.
 *
 * The audit migration surfaced a recurring pattern: every list page
 * wires the same 3-line nuqs incantation per filter (declare param,
 * memoize the value, debounce-cursor-reset on change). These helpers
 * compress that to a single hook call and bake in the cross-cutting
 * "reset cursor + crumbs" side effect so feature filters stay one-liner.
 *
 * For full primitives (search input, date range, tabs) prefer the
 * `<Url*>` wrappers in `src/components/shared/url-*.tsx` — they own
 * the rendering AND the state. Use these helpers for one-off filters
 * that don't have a sink primitive yet (raw `<Select>` / `<RadioGroup>`
 * / custom controls).
 */

const NUQS_OPTS_SERVER_SYNCED = {
  clearOnDefault: true,
  history: "replace" as const,
  // `shallow: false` ensures the RSC page re-runs whenever the filter
  // changes — without it the URL updates client-only and the server
  // returns stale data until a hard refresh.
  shallow: false as const,
};

export type UrlStringFilter = Readonly<{
  /** Current value, `null` when unset. */
  value: string | null;
  /** Setter — pass `null` to clear. */
  set: (next: string | null) => void;
}>;

/**
 * useUrlString — single optional URL-bound string param.
 *
 * Pass `resetParams` to clear additional URL params alongside this one
 * on every change (typically `["cursor", "crumbs"]` on cursor-paginated
 * tables — old cursors point into pre-filter results).
 */
export function useUrlString(
  param: string,
  options?: { resetParams?: readonly string[] },
): UrlStringFilter {
  const [value, setValueRaw] = useQueryState(
    param,
    parseAsString.withOptions(NUQS_OPTS_SERVER_SYNCED),
  );
  const reset = useResetParams(options?.resetParams);
  const set = React.useCallback(
    (next: string | null): void => {
      void setValueRaw(next);
      reset();
    },
    [setValueRaw, reset],
  );
  return { value, set };
}

export type UrlEnumFilter<T extends string> = Readonly<{
  value: T | null;
  set: (next: T | null) => void;
}>;

/**
 * useUrlEnum — URL-bound param constrained to a known set of values.
 *
 * Out-of-set URL values (e.g., bookmarked from an older deploy) are
 * treated as null so the page never renders an invalid filter state.
 */
export function useUrlEnum<T extends string>(
  param: string,
  values: readonly T[],
  options?: { resetParams?: readonly string[] },
): UrlEnumFilter<T> {
  const [value, setValueRaw] = useQueryState(
    param,
    parseAsStringEnum<T>([...values]).withOptions(NUQS_OPTS_SERVER_SYNCED),
  );
  const reset = useResetParams(options?.resetParams);
  const set = React.useCallback(
    (next: T | null): void => {
      void setValueRaw(next);
      reset();
    },
    [setValueRaw, reset],
  );
  return { value, set };
}

/**
 * Hard cap on the number of params one `useResetParams` call can clear.
 * Bounded by the Rules of Hooks — we declare a fixed slot count of
 * `useQueryState` calls at the top level. Five covers every current
 * filter page (audit uses 2: cursor + crumbs). If a future caller needs
 * more, expand the slot list — there's no way around the Rules of Hooks.
 */
const RESET_SLOT_COUNT = 5;

/**
 * useResetParams — returns a function that clears the listed URL params.
 *
 * Use to bridge filter changes with cursor reset. The Url* wrappers
 * call this internally; expose it here so feature pages with custom
 * filter controls can match the same reset semantics.
 *
 * The empty-array case is allowed and returns a no-op so callers can
 * unconditionally invoke the reset without branching on configuration.
 */
export function useResetParams(params: readonly string[] | undefined): () => void {
  const list = params ?? [];
  if (list.length > RESET_SLOT_COUNT) {
    throw new Error(
      `useResetParams supports up to ${RESET_SLOT_COUNT} params; received ${list.length}.`,
    );
  }

  // Five fixed `useQueryState` slots — `useQueryState` is a hook and
  // can't be called conditionally or in a loop. Unused slots write to
  // sentinel param names that never appear in real URLs.
  const [, set0] = useQueryState(list[0] ?? "__reset_unused_0__", parseAsString);
  const [, set1] = useQueryState(list[1] ?? "__reset_unused_1__", parseAsString);
  const [, set2] = useQueryState(list[2] ?? "__reset_unused_2__", parseAsString);
  const [, set3] = useQueryState(list[3] ?? "__reset_unused_3__", parseAsString);
  const [, set4] = useQueryState(list[4] ?? "__reset_unused_4__", parseAsString);

  // String key proxies for the param list — different keys ⇒ different
  // lists ⇒ a new returned callback. Setters are nuqs-stable per param.
  const key = list.join("\x00");
  const length = list.length;

  return React.useCallback(() => {
    const setters = [set0, set1, set2, set3, set4];
    for (let i = 0; i < length; i++) {
      void setters[i]!(null);
    }
  }, [key, length, set0, set1, set2, set3, set4]);
}

/** Standard URL params to reset on filter change for cursor-paginated
 *  tables. Match the param names that `<CursorPagination>` writes by
 *  default. */
export const CURSOR_RESET_PARAMS = ["cursor", "crumbs"] as const;

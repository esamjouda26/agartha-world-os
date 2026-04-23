"use client";

import * as React from "react";

import { SearchInput, type SearchInputProps } from "@/components/ui/search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

/**
 * UrlSearchInput — `<SearchInput>` with self-managed URL state.
 *
 * Owns the `useQueryState` binding so feature pages don't repeat the
 * "declare param + memoize value + cursor reset" boilerplate on every
 * filter surface. Drop-in replacement for the controlled `<SearchInput>`
 * — pass `param` instead of `value` + `onChange`.
 *
 * @example
 *   // Before: 6 lines of nuqs wiring + 8 lines of `<SearchInput>` props.
 *   <UrlSearchInput param="q" placeholder="Search…" debounceMs={300}
 *                   resetParams={CURSOR_RESET_PARAMS} />
 */

export type UrlSearchInputProps = Readonly<
  Omit<SearchInputProps, "value" | "onChange"> & {
    /** URL param name (e.g. "q", "search", "name"). */
    param: string;
    /**
     * Other URL params to clear on every change. Defaults to none —
     * pass `CURSOR_RESET_PARAMS` from `url-state-helpers` to nuke
     * `cursor` + `crumbs` whenever the search narrows.
     */
    resetParams?: readonly string[];
  }
>;

export function UrlSearchInput({ param, resetParams, ...rest }: UrlSearchInputProps) {
  const filter = useUrlString(param, resetParams ? { resetParams } : undefined);
  return (
    <SearchInput
      {...rest}
      value={filter.value ?? ""}
      onChange={(next) => {
        const trimmed = next.trim();
        filter.set(trimmed.length > 0 ? trimmed : null);
      }}
    />
  );
}

"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";

import { TabPanel, type TabPanelItem, type TabPanelProps } from "@/components/ui/tab-panel";

/**
 * UrlTabPanel — `<TabPanel>` with self-managed URL state.
 *
 * Owns the active-tab `useQueryState` binding so detail pages don't
 * repeat the same nuqs incantation per tab strip. Drop-in for the
 * controlled `<TabPanel>` — pass `param` instead of `value` +
 * `onValueChange`.
 *
 * Tab IDs are validated against the provided `tabs[].id` set; an
 * out-of-set URL value (bookmarked from an older deploy with renamed
 * tabs) is treated as missing and falls back to `defaultTabId` (or
 * the first tab).
 *
 * URL mode defaults to client-only (`shallow: true`) since active-tab
 * almost never gates server queries — the entire tab content is
 * usually fetched up-front. Override via `shallow={false}` when a tab
 * change SHOULD trigger an RSC refetch.
 */

export type UrlTabPanelProps = Readonly<
  Omit<TabPanelProps, "value" | "onValueChange" | "defaultValue"> & {
    /** URL param name (e.g. "tab", "view"). */
    param: string;
    /**
     * Default tab id when the URL has no value. Falls back to `tabs[0].id`.
     * Pages that want the default to be omitted from the URL leave this
     * as the value the user lands on first — `clearOnDefault: true`
     * keeps the URL short.
     */
    defaultTabId?: string;
    /**
     * `true` (default) → URL update doesn't trigger RSC refetch (tab
     * content is client-rendered from already-loaded data).
     * `false` → tab change re-runs RSC (tab content depends on the
     * active tab — e.g. each tab fires a different server query).
     */
    shallow?: boolean;
  }
>;

export function UrlTabPanel({
  param,
  defaultTabId,
  shallow = true,
  tabs,
  ...rest
}: UrlTabPanelProps) {
  const ids = React.useMemo(() => tabs.map((t) => t.id), [tabs]);
  const fallback = defaultTabId ?? ids[0];

  if (ids.length === 0 || !fallback) {
    // Empty tabs array — nothing to render. Defer to the underlying
    // `<TabPanel>` which handles the empty case by returning null.
    return <TabPanel tabs={tabs} {...rest} />;
  }

  return (
    <UrlTabPanelInner
      param={param}
      ids={ids}
      fallback={fallback}
      shallow={shallow}
      tabs={tabs}
      {...rest}
    />
  );
}

function UrlTabPanelInner({
  param,
  ids,
  fallback,
  shallow,
  tabs,
  ...rest
}: Omit<TabPanelProps, "value" | "onValueChange" | "defaultValue"> & {
  param: string;
  ids: readonly string[];
  fallback: string;
  shallow: boolean;
  tabs: readonly TabPanelItem[];
}) {
  const [value, setValueRaw] = useQueryState(
    param,
    parseAsStringEnum([...ids]).withOptions({
      clearOnDefault: true,
      history: "replace",
      shallow,
    }),
  );
  const resolvedValue = value ?? fallback;
  const handleChange = React.useCallback(
    (next: string): void => {
      // Omit the default from the URL via `clearOnDefault: true` —
      // pass `null` when the user picks the default tab so the param
      // disappears from the URL.
      void setValueRaw(next === fallback ? null : (next as never));
    },
    [setValueRaw, fallback],
  );

  return <TabPanel tabs={tabs} value={resolvedValue} onValueChange={handleChange} {...rest} />;
}

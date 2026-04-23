"use client";

import * as React from "react";

import {
  ConfirmDialog,
  type ConfirmDialogIntent,
  type ConfirmDialogProps,
} from "@/components/ui/confirm-dialog";

/**
 * BulkActionConfirmation — confirm dialog tuned for multi-row actions.
 *
 * Wraps `<ConfirmDialog>` with pluralized affected-item summary and a
 * scrollable preview of up to `previewLimit` items. Callers use this for
 * bulk operations over selected rows (void punches, terminate users,
 * mark POs as sent, cancel bookings).
 *
 * `pluralize` helps render "1 punch" vs "3 punches" without callers
 * hand-rolling singular/plural logic at every site. Pass the noun and
 * the count — the component handles the rest.
 *
 * For single-item confirmations, use `<ConfirmDialog>` directly.
 */

export type BulkActionConfirmationProps = Readonly<
  Omit<ConfirmDialogProps, "children" | "description" | "title" | "intent"> & {
    /** Number of affected rows. */
    count: number;
    /** Noun describing affected items (singular). Auto-pluralized with `-s`. */
    itemNoun: string;
    /** Custom plural form. Defaults to `${itemNoun}s`. */
    itemNounPlural?: string;
    /** Override action phrasing (defaults to the intent's default verb). */
    actionVerb?: string;
    intent?: ConfirmDialogIntent;
    /** Optional preview list — rendered inside a scrollable card. */
    previewItems?: readonly React.ReactNode[];
    previewLimit?: number;
    /** Extra description content appended under the default sentence. */
    descriptionExtra?: React.ReactNode;
    titleOverride?: React.ReactNode;
  }
>;

const DEFAULT_VERB: Record<ConfirmDialogIntent, string> = {
  destructive: "delete",
  warning: "update",
  info: "process",
};

export function BulkActionConfirmation({
  count,
  itemNoun,
  itemNounPlural,
  actionVerb,
  intent = "warning",
  previewItems,
  previewLimit = 8,
  descriptionExtra,
  titleOverride,
  "data-testid": testId,
  ...rest
}: BulkActionConfirmationProps) {
  const plural = itemNounPlural ?? `${itemNoun}s`;
  const noun = count === 1 ? itemNoun : plural;
  const verb = actionVerb ?? DEFAULT_VERB[intent];
  const countLabel = `${count.toLocaleString()} ${noun}`;

  const title = titleOverride ?? `${capitalize(verb)} ${countLabel}?`;
  const description = (
    <>
      You are about to {verb}{" "}
      <strong className="text-foreground font-semibold">{countLabel}</strong>.
      {descriptionExtra ? <> {descriptionExtra}</> : null}
    </>
  );

  const visiblePreview = previewItems?.slice(0, previewLimit) ?? [];
  const overflow = (previewItems?.length ?? 0) - visiblePreview.length;

  return (
    <ConfirmDialog
      {...rest}
      intent={intent}
      title={title}
      description={description}
      {...(testId !== undefined ? { "data-testid": testId } : {})}
    >
      {visiblePreview.length > 0 ? (
        <div className="border-border-subtle bg-surface/60 max-h-48 overflow-y-auto rounded-lg border px-3 py-2 text-sm">
          <ul className="flex flex-col gap-1">
            {visiblePreview.map((item, index) => (
              <li key={index} className="text-foreground-muted truncate">
                {item}
              </li>
            ))}
          </ul>
          {overflow > 0 ? (
            <p className="text-foreground-subtle mt-1 text-xs">
              …and {overflow.toLocaleString()} more.
            </p>
          ) : null}
        </div>
      ) : null}
    </ConfirmDialog>
  );
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}

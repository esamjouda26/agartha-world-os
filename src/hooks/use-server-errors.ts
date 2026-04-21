"use client";

import * as React from "react";
import { useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import type { ServerActionResult } from "@/lib/errors";

/**
 * Ingest the `fields` map from a failed `ServerActionResult` and push each
 * entry into RHF's error state so `<FormMessage>` can render server errors
 * under the correct input.
 *
 * Cross-cutting hook — every server-action-bound form uses it. Lives in
 * `src/hooks/` per CLAUDE.md §1.
 */
export function useServerErrors<TValues extends FieldValues>(
  result: ServerActionResult<unknown> | undefined,
): void {
  const { setError } = useFormContext<TValues>();
  React.useEffect(() => {
    if (!result || result.success || !result.fields) return;
    for (const [field, message] of Object.entries(result.fields)) {
      setError(field as FieldPath<TValues>, { type: "server", message });
    }
  }, [result, setError]);
}

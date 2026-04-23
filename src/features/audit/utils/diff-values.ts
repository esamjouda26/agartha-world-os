import { isRestrictedColumn, RESTRICTED_MASK } from "@/features/audit/constants";

/**
 * One row of a field-level diff. `oldValue`/`newValue` are stringified
 * for display — nested objects/arrays render as JSON. Restricted
 * columns have their values replaced with `RESTRICTED_MASK`.
 */
export type DiffRow = Readonly<{
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changed: boolean;
  restricted: boolean;
}>;

function stringify(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "[unserializable]";
  }
}

/**
 * Compute a field-level diff between two JSONB snapshots.
 *
 * Behaviour:
 *   - Union of keys from both sides.
 *   - `changed` is true when stringified old !== stringified new.
 *   - Restricted columns always render as `[restricted]` on both sides
 *     regardless of actual values (defence-in-depth — even the
 *     ciphertext should not be exposed in the admin UI).
 *   - Unchanged rows are kept so reviewers can see full state if
 *     they want; the UI can hide them by default.
 */
export function computeDiffRows(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): DiffRow[] {
  const keys = new Set<string>();
  if (oldValues) for (const k of Object.keys(oldValues)) keys.add(k);
  if (newValues) for (const k of Object.keys(newValues)) keys.add(k);

  const rows: DiffRow[] = [];
  for (const field of Array.from(keys).sort()) {
    const oldStr = oldValues ? stringify(oldValues[field]) : null;
    const newStr = newValues ? stringify(newValues[field]) : null;
    const restricted = isRestrictedColumn(field);
    rows.push({
      field,
      oldValue: restricted ? (oldStr === null ? null : RESTRICTED_MASK) : oldStr,
      newValue: restricted ? (newStr === null ? null : RESTRICTED_MASK) : newStr,
      changed: oldStr !== newStr,
      restricted,
    });
  }
  return rows;
}

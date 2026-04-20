/**
 * Pure error-taxonomy mapping — extracted so unit tests can import it without
 * pulling the env-gated Supabase service client from `_shared.ts`.
 *
 * Error strings are pinned to the RPC definitions at
 * [init_schema.sql:5932-5996](supabase/migrations/20260417064731_init_schema.sql#L5932).
 */
export function mapClockRpcError(message: string): {
  code:
    | "VALIDATION_FAILED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "DEPENDENCY_FAILED"
    | "INTERNAL";
  reason: string;
} {
  if (message.includes("STAFF_RECORD_NOT_LINKED")) return { code: "FORBIDDEN", reason: message };
  if (message.includes("NO_SHIFT_SCHEDULED_TODAY")) return { code: "NOT_FOUND", reason: message };
  if (message.includes("ON_APPROVED_LEAVE")) return { code: "CONFLICT", reason: message };
  if (message.includes("PUBLIC_HOLIDAY")) return { code: "CONFLICT", reason: message };
  if (message.includes("ALREADY_CLOCKED_IN")) return { code: "CONFLICT", reason: message };
  if (message.includes("ALREADY_CLOCKED_OUT")) return { code: "CONFLICT", reason: message };
  if (message.includes("PUNCH_WINDOW")) return { code: "VALIDATION_FAILED", reason: message };
  if (message.includes("STALE_JWT")) return { code: "DEPENDENCY_FAILED", reason: message };
  if (message.includes("EXCEPTION_NOT_FOUND")) return { code: "NOT_FOUND", reason: message };
  if (message.includes("PUNCH_NOT_FOUND_OR_NOT_YOURS"))
    return { code: "NOT_FOUND", reason: message };
  if (message.includes("ALREADY_VOIDED")) return { code: "CONFLICT", reason: message };
  if (message.includes("VOID_WINDOW_EXPIRED")) return { code: "CONFLICT", reason: message };
  if (message.includes("FORBIDDEN")) return { code: "FORBIDDEN", reason: message };
  return { code: "INTERNAL", reason: message };
}

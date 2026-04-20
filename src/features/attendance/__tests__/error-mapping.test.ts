import { describe, expect, it } from "vitest";

import { mapClockRpcError } from "@/features/attendance/actions/error-mapping";

/**
 * Error-taxonomy mapping tests — pins the strings raised by
 * [init_schema.sql:5932-5996](supabase/migrations/20260417064731_init_schema.sql#L5932)
 * to the `ErrorCode` taxonomy in CLAUDE.md §4.
 */
describe("mapClockRpcError", () => {
  it.each([
    ["STAFF_RECORD_NOT_LINKED", "FORBIDDEN"],
    ["NO_SHIFT_SCHEDULED_TODAY", "NOT_FOUND"],
    ["ON_APPROVED_LEAVE", "CONFLICT"],
    ["PUBLIC_HOLIDAY", "CONFLICT"],
    ["ALREADY_CLOCKED_IN", "CONFLICT"],
    ["ALREADY_CLOCKED_OUT", "CONFLICT"],
    ["PUNCH_WINDOW_OUT_OF_RANGE", "VALIDATION_FAILED"],
    ["STALE_JWT", "DEPENDENCY_FAILED"],
    ["EXCEPTION_NOT_FOUND: xyz", "NOT_FOUND"],
    ["FORBIDDEN: not your exception", "FORBIDDEN"],
    ["unknown postgres error text", "INTERNAL"],
  ])("maps %s → %s", (message, expected) => {
    expect(mapClockRpcError(message).code).toBe(expected);
  });
});

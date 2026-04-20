import "server-only";

/**
 * Thin re-export hub for attendance action helpers. Shrank after the
 * offline-queue removal left `fail` / `ServerActionResult` unused here.
 * Kept as a one-liner so the three existing action files keep a single
 * import path while this folder's surface stabilizes.
 */

export { mapClockRpcError } from "@/features/attendance/actions/error-mapping";

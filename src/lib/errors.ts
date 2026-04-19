export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "STALE_DATA",
  "RATE_LIMITED",
  "DEPENDENCY_FAILED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorCode; fields?: Record<string, string> };

export function ok<T>(data: T): ServerActionResult<T> {
  return { success: true, data };
}

export function fail<T>(error: ErrorCode, fields?: Record<string, string>): ServerActionResult<T> {
  return fields ? { success: false, error, fields } : { success: false, error };
}

export function assertNever(value: never, context: string): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(value)}`);
}

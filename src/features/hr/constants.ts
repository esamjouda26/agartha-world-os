/**
 * HR feature constants — rate limits, UI display maps.
 * Every magic string or number lives here so code review surfaces changes.
 */

// ── Rate limits ───────────────────────────────────────────────────────────

export const CREATE_LEAVE_REQUEST_RATE_TOKENS = 10;
export const CREATE_LEAVE_REQUEST_RATE_WINDOW = "60 s" as const;

export const CANCEL_LEAVE_REQUEST_RATE_TOKENS = 10;
export const CANCEL_LEAVE_REQUEST_RATE_WINDOW = "60 s" as const;

// ── UI display maps ───────────────────────────────────────────────────────

/**
 * Badge variant per leave request status.
 * Mirrors leave_request_status enum: init_schema.sql:5707.
 */
export const LEAVE_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
} as const;

/**
 * Past-status filter options shown in the leave history tab.
 * Subset of leave_request_status enum values.
 */
export const PAST_STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

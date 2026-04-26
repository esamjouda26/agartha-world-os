import type { BookingStatus } from "@/features/booking/types";

/**
 * Display labels and badge variants for each booking status.
 * Mirrors booking_status enum: init_schema.sql:5632.
 */
export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending_payment: { label: "Pending Payment", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  checked_in: { label: "Checked In", variant: "secondary" },
  completed: { label: "Completed", variant: "secondary" },
  no_show: { label: "No Show", variant: "destructive" },
} as const;

/** Rate limits for entry-validation actions. */
export const BOOKING_LOOKUP_RATE_LIMIT_TOKENS = 60;
export const BOOKING_LOOKUP_RATE_LIMIT_WINDOW = "60 s" as const;

export const BOOKING_CHECKIN_RATE_LIMIT_TOKENS = 30;
export const BOOKING_CHECKIN_RATE_LIMIT_WINDOW = "60 s" as const;

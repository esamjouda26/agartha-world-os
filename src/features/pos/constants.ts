/**
 * POS domain constants.
 * init_schema.sql:3022 — order_status enum: 'preparing' | 'completed' | 'cancelled'
 * KDS overdue threshold (WF-13): 15 minutes in milliseconds.
 */

/** Orders older than this are flagged overdue in the KDS. WF-13 spec. */
export const KDS_OVERDUE_MS = 15 * 60 * 1000;

/** Rate-limit for submitOrder: 60 orders per 60 seconds per user. */
export const SUBMIT_ORDER_RATE_LIMIT_TOKENS = 60;
export const SUBMIT_ORDER_RATE_LIMIT_WINDOW = "60 s" as const;

/** Rate-limit for markOrderComplete: 120 completions per 60 seconds per user. */
export const COMPLETE_ORDER_RATE_LIMIT_TOKENS = 120;
export const COMPLETE_ORDER_RATE_LIMIT_WINDOW = "60 s" as const;

/** Maximum cart lines before UI warns about large orders. */
export const CART_MAX_LINES = 50;

/** Payment methods available at the POS terminal (from DB enum). */
export const PAYMENT_METHODS = ["cash", "card", "face_pay", "digital_wallet"] as const;

/** Display labels for each payment method — mirrors payment_method enum in init_schema.sql:5725. */
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  card: "Card",
  face_pay: "Face Pay",
  digital_wallet: "Digital Wallet",
} as const;

/**
 * Money formatting — the canonical entry point for currency display strings.
 *
 * Previously duplicated across booking-wizard-client, experience-tier-selector,
 * booking-summary-card, and payment/page — each with slightly different
 * `minimumFractionDigits` (0 vs 2), causing inconsistent money display
 * (e.g. "RM 227" on tier cards vs "RM 227.00" in the summary). This module
 * consolidates the formatter with an explicit `fractionDigits` option.
 *
 * Pure Intl.NumberFormat wrapper. No React imports — safe for RSC + client.
 */

/**
 * Format a numeric amount as a localized currency string.
 *
 * @param amount        Signed numeric — negative for discounts.
 * @param currency      ISO 4217 code. Defaults to `"MYR"` (facility currency).
 * @param fractionDigits Number of decimal places. Defaults to `2`.
 *
 * @example
 *   formatMoney(227)           // "RM 227.00"
 *   formatMoney(227, "MYR", 0) // "RM 227"
 *   formatMoney(-50)           // "-RM 50.00"
 */
export function formatMoney(
  amount: number,
  currency: string = "MYR",
  fractionDigits: number = 2,
): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

/**
 * Format an integer cents value as a localized currency string.
 *
 * Convenience for codepaths that store amounts in the smallest unit
 * (POS orders, payment ledgers — cents avoids float drift on
 * aggregations). Internally divides by 100 and forwards to formatMoney.
 *
 * @param cents          Amount in the smallest unit (cents).
 * @param currency       ISO 4217 code. Defaults to `"MYR"`.
 * @param fractionDigits Decimal places. Defaults to `2`.
 *
 * @example
 *   formatCents(22700)         // "RM 227.00"
 *   formatCents(22700, "USD")  // "USD 227.00"
 */
export function formatCents(
  cents: number,
  currency: string = "MYR",
  fractionDigits: number = 2,
): string {
  return formatMoney(cents / 100, currency, fractionDigits);
}

/**
 * Per-request CSP nonce + directive builder.
 *
 * Migrated out of `next.config.ts` because the CSP must include a
 * cryptographically-fresh `'nonce-…'` token per request to drop
 * `'unsafe-inline'` from `script-src`. CLAUDE.md §3 + §11 require strict,
 * nonce-based CSP for the production surface.
 *
 * Pattern (Next 16 — see https://nextjs.org/docs/app/guides/content-security-policy):
 *   1. Middleware calls `mintNonce()` + `buildCsp({ nonce, isDev })`.
 *   2. Middleware sets request header `x-nonce` so RSC layouts can read
 *      it via `headers().get("x-nonce")` if they need to attach it to
 *      explicit inline scripts.
 *   3. Middleware sets response header `Content-Security-Policy`.
 *   4. Next's framework injects the nonce into its own hydration
 *      scripts when it sees the `x-nonce` request header — no manual
 *      <script nonce={…}> wiring required for framework-emitted code.
 *
 * `'strict-dynamic'` is included so scripts loaded by nonce'd scripts
 * (Next chunks, Stripe.js when we eventually embed Elements) inherit
 * trust without their own nonces.
 */

const STRIPE_HOSTS = "https://js.stripe.com https://api.stripe.com https://checkout.stripe.com";

/**
 * Mint a base64-encoded 128-bit nonce. Uses the Edge runtime's Web
 * Crypto API (`crypto.getRandomValues`) which is available in the
 * Next.js middleware runtime by default.
 */
export function mintNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // btoa is available in Edge runtime + browser; not in Node by default,
  // but Next middleware runs in Edge runtime so it's safe.
  return btoa(binary);
}

export type BuildCspInput = Readonly<{
  nonce: string;
  isDev: boolean;
}>;

/**
 * Build the strict CSP directive string for a single request.
 *
 * Notable choices:
 *   - `script-src`: `'self' 'nonce-{n}' 'strict-dynamic'`. No
 *     `'unsafe-inline'`. Dev gets `'unsafe-eval'` so React Refresh /
 *     Webpack HMR can hot-reload; prod doesn't.
 *   - `style-src` keeps `'unsafe-inline'` because Tailwind v4 CSS-in-JS
 *     (and Radix's runtime style injection) emit inline styles that
 *     can't be nonce-tracked. CSS injection is a substantially smaller
 *     XSS surface than JS — accept it for now; revisit if a future
 *     style-src-attr override is needed.
 *   - `connect-src` whitelists Supabase (rest + realtime), Sentry,
 *     PostHog, Upstash, Stripe API.
 *   - `frame-src` whitelists Stripe Checkout's hosted frames.
 *   - `form-action` allows the Stripe Hosted Checkout redirect.
 *   - `frame-ancestors 'none'` plus `X-Frame-Options: DENY` (set in
 *     next.config.ts) double-up clickjacking defence.
 */
export function buildCsp({ nonce, isDev }: BuildCspInput): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : null,
    STRIPE_HOSTS,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.posthog.com https://*.upstash.io https://api.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ]
      .join("; ")
      // Squash any accidental whitespace runs that breaks browser CSP parsers.
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

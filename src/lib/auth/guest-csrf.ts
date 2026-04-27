import "server-only";

import { cookies } from "next/headers";
import { headers } from "next/headers";

/**
 * Anonymous double-submit CSRF for the guest booking flow.
 *
 * Spec: frontend_spec.md:3495 + Session 17 prompt §"Guest-Specific Contracts".
 * Pattern: a httpOnly cookie holds an opaque token; mutating endpoints expect
 * the same token echoed in the `x-guest-csrf` request header. Because an
 * attacker on a third-party origin cannot read the cookie nor set a custom
 * header (CORS preflight blocks both), the pair acts as a same-origin proof
 * for clients that DON'T have a Supabase Auth session.
 *
 * This module is also called from `/my-booking/manage/*` (Sessions 4-7 of
 * Phase 9a) where the guest session cookie is the auth — there the CSRF token
 * is rotated on OTP verification and on every successful mutation.
 *
 * Form-action Server Actions are CSRF-protected by Next.js out of the box
 * (the action ID is request-bound). The double-submit token is the second
 * line of defence for direct Server Action invocations from the client and
 * for `/book/payment` retry/cancel flows that rebind the user's session
 * after a redirect.
 */

const COOKIE_NAME = "guest_csrf";
const HEADER_NAME = "x-guest-csrf";
/** 12 hours — long enough for booking → payment retry, short enough that
 * a stolen cookie expires before a typical browsing session ends. */
const TTL_SECONDS = 60 * 60 * 12;

/** Crypto-strong 256-bit token, base64url-encoded. */
function mintToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url so the token is URL-safe and cookie-safe without escaping.
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Reads the existing token from the request cookies, or mints + sets a
 * new one if absent. Safe to call from Server Actions (cookies().set is
 * permitted). When called from an RSC render the set() throws because
 * Next.js disallows cookie writes outside Server Actions / Route Handlers
 * / middleware — we swallow the throw with the same try/catch pattern
 * `createSupabaseServerClient` uses (src/lib/supabase/server.ts:21-26),
 * so the page renders without losing the request and the next mutation
 * action will mint a token at that point.
 */
export async function ensureGuestCsrf(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing && existing.length >= 16) return existing;
  const token = mintToken();
  try {
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TTL_SECONDS,
    });
  } catch {
    // RSC render branch — caller is in a Server Component, cookies are
    // read-only here. The next Server Action invocation will mint via
    // the action-bound cookie store.
  }
  return token;
}

/** Re-mints the token. Invoked after every successful guest mutation. */
export async function rotateGuestCsrf(): Promise<string> {
  const store = await cookies();
  const token = mintToken();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return token;
}

/**
 * Verifies that the request carries a `x-guest-csrf` header matching the
 * cookie. Returns true iff both are present and equal in constant time.
 *
 * NOTE on Next.js Server Actions: invocations via `useTransition` /
 * `startTransition` use Next's internal RPC channel and DO NOT permit
 * the client to set custom headers. For those code paths use
 * `verifyGuestSameOrigin()` instead — it relies on the Origin/Referer
 * header that the browser populates automatically. The
 * `x-guest-csrf` double-submit token remains in place for any future
 * fetch-based route handler that needs it.
 */
export async function verifyGuestCsrf(): Promise<boolean> {
  const [store, hdrs] = await Promise.all([cookies(), headers()]);
  const cookieToken = store.get(COOKIE_NAME)?.value;
  const headerToken = hdrs.get(HEADER_NAME);
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Same-origin verification for guest mutating Server Actions.
 *
 * Pattern: every browser populates Origin (or, for legacy GETs, Referer)
 * automatically on POST requests. A cross-site attacker submitting a
 * forged form to our Server Action endpoint will inherit their own
 * origin, not ours — so checking that Origin matches the request Host
 * is a robust CSRF defence that doesn't require the client to opt in.
 *
 * Next.js 16 enforces this automatically for Server Actions via the
 * `serverActions.allowedOrigins` config. This helper is the explicit
 * belt-and-suspenders for the guest portal: a misconfigured allowed-
 * origins list, an upstream proxy stripping headers, or a future Next
 * regression all become detectable instead of silent bypass.
 *
 * Returns true on:
 *   - Origin matches Host (preferred path)
 *   - Origin missing AND Referer host matches Host (legacy fallback)
 *   - In dev (NODE_ENV !== "production") when both are missing —
 *     because some local tooling (curl during dev, Playwright on
 *     localhost) doesn't populate Origin for same-origin form posts.
 */
export async function verifyGuestSameOrigin(): Promise<boolean> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? hdrs.get("x-forwarded-host") ?? null;
  if (!host) {
    // No host header at all is suspicious — refuse in production,
    // permit in dev so unit tests / scripts can still hit actions.
    return process.env.NODE_ENV !== "production";
  }

  const origin = hdrs.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  const referer = hdrs.get("referer");
  if (referer) {
    try {
      const refHost = new URL(referer).host;
      return refHost === host;
    } catch {
      return false;
    }
  }

  // Neither Origin nor Referer present. Production: refuse.
  // Dev: permit (server-side test harnesses).
  return process.env.NODE_ENV !== "production";
}

export const GUEST_CSRF_COOKIE = COOKIE_NAME;
export const GUEST_CSRF_HEADER = HEADER_NAME;
export const GUEST_CSRF_TTL_SECONDS = TTL_SECONDS;

/**
 * Middleware-friendly token mint. The standard `ensureGuestCsrf` uses
 * `next/headers` `cookies()` which is Server Action / Route Handler
 * surface only. Middleware uses NextResponse cookies, so we expose a
 * pure-token mint here and let the middleware set it on the response.
 */
export function mintGuestCsrfToken(): string {
  return mintToken();
}

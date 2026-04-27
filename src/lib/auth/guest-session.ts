import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { GUEST_SESSION_COOKIE } from "@/features/booking/constants";

/**
 * HMAC-signed `guest_session` cookie for the OTP-authenticated guest.
 *
 * Spec: frontend_spec.md:3575 — "set guest session cookie (httpOnly, secure,
 * sameSite=strict, maxAge=4h, path=/my-booking/manage)".
 *
 * Format: `<base64url(JSON_payload)>.<base64url(hmac)>` where
 *   payload = { ref: <booking_ref>, exp: <unix_ms> }
 *   hmac    = HMAC-SHA256(payload_b64url) under a key derived from
 *             SUPABASE_SERVICE_ROLE_KEY. Service-role is the only env-gated
 *             secret already required by `src/lib/env.ts`; deriving the
 *             session key from it (with a domain-separator) avoids a new
 *             env var while keeping the keys distinct.
 *
 * Cookie attributes follow the spec:
 *   httpOnly: true
 *   secure: true (in prod)
 *   sameSite: "strict"
 *   path: "/my-booking/manage"
 *   maxAge: 14400 (4 hours)
 *
 * Defence-in-depth: the cookie is also bound to `path=/my-booking/manage`
 * so the browser does not send it on /book or /book/payment. The HMAC
 * is the second line — even if a developer accidentally widens the path
 * scope, a forged ref still fails verification.
 */

const TTL_SECONDS = 60 * 60 * 4;
const COOKIE_PATH = "/my-booking/manage";
const HMAC_DOMAIN = ":guest-session:v1";

let cachedKey: Buffer | null = null;
function sessionKey(): Buffer {
  if (cachedKey) return cachedKey;
  cachedKey = createHash("sha256")
    .update(env.SUPABASE_SERVICE_ROLE_KEY + HMAC_DOMAIN)
    .digest();
  return cachedKey;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64");
}

type SessionPayload = Readonly<{
  ref: string;
  exp: number;
}>;

/**
 * Mint a fresh signed session token for `bookingRef`. Sets the cookie on
 * the outgoing response.
 */
export async function signGuestSession(bookingRef: string): Promise<void> {
  const payload: SessionPayload = {
    ref: bookingRef.toUpperCase(),
    exp: Date.now() + TTL_SECONDS * 1000,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", sessionKey()).update(payloadB64).digest();
  const token = `${payloadB64}.${b64url(sig)}`;

  const store = await cookies();
  store.set(GUEST_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: TTL_SECONDS,
  });
}

/**
 * Read + verify the cookie, returning the booking_ref the session is
 * scoped to, or null if the cookie is missing/expired/tampered.
 *
 * Safe to call from RSC render (read-only).
 */
export async function readGuestSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(GUEST_SESSION_COOKIE)?.value;
  if (!token) return null;

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const expected = createHmac("sha256", sessionKey()).update(payloadB64).digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sigB64);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof payload.ref !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;
  return payload.ref;
}

/** Clears the session cookie (sign-out / OTP teardown). */
export async function clearGuestSession(): Promise<void> {
  const store = await cookies();
  store.set(GUEST_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

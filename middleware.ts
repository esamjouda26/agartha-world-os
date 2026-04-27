import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import {
  GUEST_CSRF_COOKIE,
  GUEST_CSRF_TTL_SECONDS,
  mintGuestCsrfToken,
} from "@/lib/auth/guest-csrf";
import { routing } from "@/i18n/routing";
import { hasDomainAccess, isSharedBypass, resolveRouteRequirement } from "@/lib/rbac/policy";
import { brandLocaleStripped, type DomainAccess, type LocaleStrippedPath } from "@/lib/rbac/types";
import { buildCsp, mintNonce } from "@/lib/security/csp";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const NONCE_HEADER = "x-nonce";
const CSP_HEADER = "Content-Security-Policy";

/**
 * Decorate a NextResponse with the per-request CSP header. Called on
 * every response path (next, redirect, supabase-decorated). We set BOTH
 * the response CSP and forward the nonce on x-nonce so RSC layouts can
 * read it via `headers()` if they need to attach it to explicit inline
 * scripts.
 */
function applyCsp(response: NextResponse, nonce: string, csp: string): NextResponse {
  response.headers.set(CSP_HEADER, csp);
  response.headers.set(NONCE_HEADER, nonce);
  return response;
}

type AccessLevel = "admin" | "manager" | "crew";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

const STAFF_PORTAL_PATTERN = /^\/(admin|management|crew)(\/|$)/;
const AUTH_PATH = "/auth";
const LOGIN_PATH = "/auth/login";
const SET_PASSWORD_PATH = "/auth/set-password";
const NOT_STARTED_PATH = "/auth/not-started";
const ACCESS_REVOKED_PATH = "/auth/access-revoked";
// Gate 6 (MFA) is intentionally NOT implemented here. The JWT
// `app_metadata` shape emitted by `handle_profile_role_change`
// (init_schema.sql:497-507) has no `mfa_verified` claim, so enforcing it
// at the edge would lock every admin out. See
// `docs/adr/0002-defer-mfa-gate.md`.

/**
 * Strip the leading locale segment from a pathname and brand the result
 * as `LocaleStrippedPath`. This is the ONLY legitimate call site that
 * mints the brand — the ESLint rule bans `as LocaleStrippedPath` casts
 * anywhere else (ADR-0004).
 */
function stripLocale(pathname: string): LocaleStrippedPath {
  const stripped = pathname.replace(LOCALE_PATTERN, "");
  return brandLocaleStripped(stripped === "" ? "/" : stripped);
}

function currentLocale(pathname: string): string {
  const match = pathname.match(LOCALE_PATTERN);
  return match?.[1] ?? routing.defaultLocale;
}

function portalRootForAccessLevel(level: AccessLevel): string {
  switch (level) {
    case "admin":
      return "/admin/it";
    case "manager":
      return "/management";
    case "crew":
      return "/crew/attendance";
    default:
      return "/auth/login";
  }
}

function redirectTo(
  request: NextRequest,
  locale: string,
  path: string,
  searchParams?: Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${path}`;
  url.search = "";
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return NextResponse.redirect(url);
}

function isKitchenSinkProdBlocked(pathname: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  // Escape hatch: deferred Phase 2A Lighthouse perf gate (prompt.md
  // §Phase 3 Verification) measures /kitchen-sink against a production
  // build. Gate unlocks only when `ALLOW_KITCHEN_SINK=1` is set at boot.
  if (process.env.ALLOW_KITCHEN_SINK === "1") return false;
  return /^\/kitchen-sink(\/|$)/.test(pathname) || /^\/(en|ms)\/kitchen-sink(\/|$)/.test(pathname);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 0. /kitchen-sink is dev-only; serve 404 in production (both with and without locale prefix).
  if (isKitchenSinkProdBlocked(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Short-circuit static assets and Next internals before any cost.
  // Static assets don't need CSP (they don't render HTML); skipping
  // here saves nonce generation + header writes per-asset.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    /\.(png|jpe?g|gif|svg|ico|webp|avif|woff2?|css|js|map|txt|xml|json)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // CSP nonce — mint once per HTML-bearing request. Rest of the function
  // forwards this on `x-nonce` (request-side) so Next can stamp it onto
  // its own framework scripts, and writes it to `Content-Security-Policy`
  // on every response branch via `applyCsp()`.
  const nonce = mintNonce();
  const csp = buildCsp({ nonce, isDev: process.env.NODE_ENV !== "production" });
  // Forward the nonce to RSC layouts via a request-side header. Mutating
  // `request.headers` in place is the supported Next-middleware pattern
  // for telling the framework which nonce to stamp onto its own inline
  // hydration/runtime scripts. Doing this BEFORE invoking intlMiddleware
  // ensures the nonce travels with the request through every downstream
  // code path that internally calls `NextResponse.next()`.
  request.headers.set(NONCE_HEADER, nonce);
  request.headers.set(CSP_HEADER, csp);
  const forwardedRequestInit = { headers: request.headers } as const;

  // /kitchen-sink lives outside the [locale] segment (dev-only route
  // under `src/app/(dev)/kitchen-sink`). Skip i18n rewriting so the
  // path stays at /kitchen-sink. In production the earlier
  // `isKitchenSinkProdBlocked` check already 404s it; this branch only
  // fires when the escape hatch is on or in development.
  if (/^\/kitchen-sink(\/|$)/.test(pathname)) {
    return applyCsp(NextResponse.next({ request: forwardedRequestInit }), nonce, csp);
  }

  // 1. Normalize locale via next-intl. If the URL is missing a locale prefix
  // this returns a redirect/rewrite; return it so the browser retries.
  const intlResponse = intlMiddleware(request);
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return applyCsp(intlResponse, nonce, csp);
  }

  const locale = currentLocale(pathname);
  const pathWithoutLocale = stripLocale(pathname);

  // 2. Auth routes pass through. No session checks.
  if (pathWithoutLocale.startsWith(AUTH_PATH) || pathWithoutLocale === "/") {
    return applyCsp(intlResponse, nonce, csp);
  }

  // 2b. Guest portal: pass through, but mint the guest_csrf cookie on
  // first visit so the double-submit token exists for any future
  // fetch-based mutating call (route handlers; not Next Server Actions
  // which use Next's built-in Origin enforcement). Cookie persists across
  // navigations because TTL is 12 hours and path is "/".
  if (
    pathWithoutLocale.startsWith("/book") ||
    pathWithoutLocale.startsWith("/my-booking") ||
    pathWithoutLocale.startsWith("/survey")
  ) {
    if (!request.cookies.get(GUEST_CSRF_COOKIE)) {
      const token = mintGuestCsrfToken();
      intlResponse.cookies.set(GUEST_CSRF_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GUEST_CSRF_TTL_SECONDS,
      });
    }
    return applyCsp(intlResponse, nonce, csp);
  }

  // 3. Staff portal gates — only execute for /admin, /management, /crew.
  if (!STAFF_PORTAL_PATTERN.test(pathWithoutLocale)) {
    return applyCsp(intlResponse, nonce, csp);
  }

  const { supabase, response } = await createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate 1 — no session.
  if (!user) {
    return applyCsp(redirectTo(request, locale, LOGIN_PATH, { next: pathname }), nonce, csp);
  }

  // Gate 2 + Gate 3 — password_set + employment_status.
  // Neither is present on the JWT; both live on `profiles`. One indexed
  // lookup per request is the cost of edge-enforcing these gates.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("password_set, employment_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    // Fail closed: treat missing profile as unauthenticated.
    return applyCsp(redirectTo(request, locale, LOGIN_PATH), nonce, csp);
  }

  if (profile.password_set === false && pathWithoutLocale !== SET_PASSWORD_PATH) {
    return applyCsp(redirectTo(request, locale, SET_PASSWORD_PATH), nonce, csp);
  }

  switch (profile.employment_status) {
    case "pending":
      return applyCsp(redirectTo(request, locale, NOT_STARTED_PATH), nonce, csp);
    case "suspended":
    case "terminated":
      return applyCsp(redirectTo(request, locale, ACCESS_REVOKED_PATH), nonce, csp);
    case "on_leave":
      response.headers.set("x-agartha-readonly", "true");
      break;
    case "active":
    default:
      break;
  }

  // Gate 4 — portal ↔ access_level alignment.
  const appMetadata = (user.app_metadata ?? {}) as {
    access_level?: AccessLevel;
    domains?: Record<string, readonly string[]>;
  };
  const accessLevel = appMetadata.access_level;
  if (!accessLevel) {
    return applyCsp(redirectTo(request, locale, ACCESS_REVOKED_PATH), nonce, csp);
  }

  const portalSegment = pathWithoutLocale.match(/^\/(admin|management|crew)/)?.[1];
  const portalAllowed =
    (portalSegment === "admin" && accessLevel === "admin") ||
    (portalSegment === "management" && (accessLevel === "admin" || accessLevel === "manager")) ||
    (portalSegment === "crew" &&
      (accessLevel === "admin" || accessLevel === "manager" || accessLevel === "crew"));

  if (!portalAllowed) {
    return applyCsp(redirectTo(request, locale, portalRootForAccessLevel(accessLevel)), nonce, csp);
  }

  // Gate 5 — domain-presence check via route manifest.
  // Shared routes (settings / attendance / announcements / reports / audit)
  // bypass this gate; they fall back to RLS + page-level filtering.
  if (!isSharedBypass(pathWithoutLocale)) {
    const requirement = resolveRouteRequirement(pathWithoutLocale);
    if (requirement) {
      const { domain, access, additionalDomains } = requirement;
      const primaryOk = hasDomainAccess(appMetadata.domains, domain, access as DomainAccess);
      const alternateOk =
        !primaryOk && additionalDomains
          ? additionalDomains.some((alt) =>
              hasDomainAccess(appMetadata.domains, alt.domain, alt.access),
            )
          : false;
      if (!primaryOk && !alternateOk) {
        // 403 redirect to portal landing with flash toast hint per §7.
        const landing = portalRootForAccessLevel(accessLevel);
        return applyCsp(
          redirectTo(request, locale, landing, { denied: `${domain}:${access}` }),
          nonce,
          csp,
        );
      }
      // Gate 6 (MFA) — intentionally skipped. See comment near top of file.
    }
  }

  // Merge i18n cookie/rewrite side-effects onto the supabase response so
  // Set-Cookie from both middlewares survives.
  for (const [key, value] of intlResponse.headers.entries()) {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  }
  return applyCsp(response, nonce, csp);
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

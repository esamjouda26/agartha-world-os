import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import {
  hasDomainAccess,
  isSharedBypass,
  resolveRouteRequirement,
  type DomainAccess,
} from "@/lib/rbac/route-manifest";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

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

function stripLocale(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PATTERN, "");
  return stripped === "" ? "/" : stripped;
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
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    /\.(png|jpe?g|gif|svg|ico|webp|avif|woff2?|css|js|map|txt|xml|json)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // /kitchen-sink lives outside the [locale] segment (dev-only route
  // under `src/app/(dev)/kitchen-sink`). Skip i18n rewriting so the
  // path stays at /kitchen-sink. In production the earlier
  // `isKitchenSinkProdBlocked` check already 404s it; this branch only
  // fires when the escape hatch is on or in development.
  if (/^\/kitchen-sink(\/|$)/.test(pathname)) {
    return NextResponse.next();
  }

  // 1. Normalize locale via next-intl. If the URL is missing a locale prefix
  // this returns a redirect/rewrite; return it so the browser retries.
  const intlResponse = intlMiddleware(request);
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const locale = currentLocale(pathname);
  const pathWithoutLocale = stripLocale(pathname);

  // 2. Auth routes and guest/public routes pass through. No session checks.
  if (
    pathWithoutLocale.startsWith(AUTH_PATH) ||
    pathWithoutLocale === "/" ||
    pathWithoutLocale.startsWith("/book") ||
    pathWithoutLocale.startsWith("/my-booking") ||
    pathWithoutLocale.startsWith("/survey")
  ) {
    return intlResponse;
  }

  // 3. Staff portal gates — only execute for /admin, /management, /crew.
  if (!STAFF_PORTAL_PATTERN.test(pathWithoutLocale)) {
    return intlResponse;
  }

  const { supabase, response } = await createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate 1 — no session.
  if (!user) {
    return redirectTo(request, locale, LOGIN_PATH, { next: pathname });
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
    return redirectTo(request, locale, LOGIN_PATH);
  }

  if (profile.password_set === false && pathWithoutLocale !== SET_PASSWORD_PATH) {
    return redirectTo(request, locale, SET_PASSWORD_PATH);
  }

  switch (profile.employment_status) {
    case "pending":
      return redirectTo(request, locale, NOT_STARTED_PATH);
    case "suspended":
    case "terminated":
      return redirectTo(request, locale, ACCESS_REVOKED_PATH);
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
    return redirectTo(request, locale, ACCESS_REVOKED_PATH);
  }

  const portalSegment = pathWithoutLocale.match(/^\/(admin|management|crew)/)?.[1];
  const portalAllowed =
    (portalSegment === "admin" && accessLevel === "admin") ||
    (portalSegment === "management" && (accessLevel === "admin" || accessLevel === "manager")) ||
    (portalSegment === "crew" &&
      (accessLevel === "admin" || accessLevel === "manager" || accessLevel === "crew"));

  if (!portalAllowed) {
    return redirectTo(request, locale, portalRootForAccessLevel(accessLevel));
  }

  // Gate 5 — domain-presence check via route manifest.
  // Shared routes (settings / attendance / announcements / reports / audit)
  // bypass this gate; they fall back to RLS + page-level filtering.
  if (!isSharedBypass(pathWithoutLocale)) {
    const requirement = resolveRouteRequirement(pathWithoutLocale);
    if (requirement) {
      const { domain, access } = requirement;
      const ok = hasDomainAccess(appMetadata.domains, domain, access as DomainAccess);
      if (!ok) {
        // 403 redirect to portal landing with flash toast hint per §7.
        const landing = portalRootForAccessLevel(accessLevel);
        return redirectTo(request, locale, landing, { denied: `${domain}:${access}` });
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
  return response;
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

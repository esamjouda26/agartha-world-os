import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Bundle analyzer — enabled only when ANALYZE=1 is set. Emits an
// HTML report at .next/analyze/client.html + server.html so we can
// verify the per-route crew-mobile budget (200 KB gzipped, CLAUDE.md
// §14) during Phase 4 follow-up gates.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "1",
});

const isDev = process.env.NODE_ENV !== "production";

// CSP baseline. Nonce-based hardening of `script-src` is left for a later
// phase that wires nonce propagation through middleware + layout. For now
// we allow `'unsafe-inline'` so Next's framework scripts run; upgrading is
// tracked for Phase 10 hardening alongside report-only rollout.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.posthog.com https://*.ingest.sentry.io https://*.upstash.io wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// NOTE: Due to Next.js App Router's client-side SPA navigation, route-specific
// Permissions-Policy headers do not re-evaluate when moving between routes.
// Therefore, we must opt-in to `self` device permissions globally so features
// like /crew/attendance (GPS+Camera) do not fail upon client-side routing.
// Microphone and payment stay denied everywhere.
const PERMISSIONS_DEFAULT = "camera=(self), geolocation=(self), microphone=(), payment=()";

const baseSecurityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
] as const;

const headersForPermissionsPolicy = (value: string) => [
  ...baseSecurityHeaders,
  { key: "Permissions-Policy", value },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pino", "pino-pretty"],
  async headers() {
    return [
      // Default baseline applies to every route.
      {
        source: "/:path*",
        headers: headersForPermissionsPolicy(PERMISSIONS_DEFAULT),
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));

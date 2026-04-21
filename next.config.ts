import { withSentryConfig } from "@sentry/nextjs";
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

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "kings-park",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
